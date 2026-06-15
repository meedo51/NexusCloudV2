import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { prepare, logActivity } from '../database';
import { authenticateToken } from '../middleware/auth';
import { FileEntry, ShareLink } from '../types';

const router = Router();
const UPLOAD_DIR_PATH = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

function generateToken(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}


async function verifyShareAccess(token: string, password: string | undefined): Promise<{ share: ShareLink; error?: { status: number; message: string } }> {
  const share = await prepare('SELECT * FROM share_links WHERE token = $?').get(token) as ShareLink | undefined;
  if (!share) return { share: null!, error: { status: 404, message: 'Share link not found' } };
  if (new Date(share.expiresAt) < new Date()) return { share, error: { status: 410, message: 'Share link has expired' } };
  if (share.passwordHash) {
    if (!password) return { share, error: { status: 403, message: 'Password required' } };
    if (!await bcrypt.compare(password, share.passwordHash)) return { share, error: { status: 403, message: 'Invalid password' } };
  }
  return { share };
}

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { fileId, password, expiresInDays = 7, permission = 'download', allowUpload = false } = req.body;
  const userId = req.user!.userId;

  if (!fileId) {
    res.status(400).json({ error: 'fileId is required' });
    return;
  }

  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const isFolder = file.isFolder;
  if (!isFolder && allowUpload) {
    res.status(400).json({ error: 'allowUpload can only be set for folders' });
    return;
  }

  const id = uuidv4();
  const token = generateToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(expiresInDays) || 7));

  let passwordHash: string | null = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  await prepare(`
    INSERT INTO share_links (id, fileId, token, passwordHash, expiresAt, createdAt, downloads, isFolder, permission, allowUpload)
    VALUES ($?, $?, $?, $?, $?, NOW(), 0, $?, $?, $?)
  `).run(id, fileId, token, passwordHash, expiresAt.toISOString(), isFolder, permission, allowUpload);

  const share = await prepare('SELECT * FROM share_links WHERE id = $?').get(id);
  await logActivity({ userId, action: 'share_create', itemType: isFolder ? 'folder' : 'file', itemId: fileId, itemName: file.originalName, details: { shareId: id, token, expiresAt, permission, allowUpload }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.status(201).json(share);
});

router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const shares = await prepare(`
    SELECT sl.*, f.name as fileName, f.originalName, f.mimeType, f.size
    FROM share_links sl
    JOIN files f ON sl.fileId = f.id
    WHERE f.userId = $?
    ORDER BY sl.createdAt DESC
  `).all(userId);

  res.json(shares);
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const share = await prepare(`
    SELECT sl.* FROM share_links sl
    JOIN files f ON sl.fileId = f.id
    WHERE sl.id = $? AND f.userId = $?
  `).get(id, userId) as ShareLink | undefined;

  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  await prepare('DELETE FROM share_links WHERE id = $?').run(id);
  res.json({ message: 'Share link deleted' });
});

router.get('/access/:token', async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const password: string | undefined = req.query.password as string | undefined;

  const { share, error } = await verifyShareAccess(token, password);
  if (error) {
    if (error.status === 403 && !password) {
      res.json({ protected: true });
      return;
    }
    res.status(error.status).json({ error: error.message });
    return;
  }

  const file = await prepare('SELECT * FROM files WHERE id = $?').get(share.fileId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await prepare('UPDATE share_links SET downloads = downloads + 1 WHERE id = $?').run(share.id);

  try {
    const owner = await prepare('SELECT userId FROM files WHERE id = $?').get(share.fileId) as any;
    if (owner) {
      await logActivity({ userId: owner.userId, action: 'share_access', itemType: file.isFolder ? 'folder' : 'file', itemId: share.fileId, itemName: file.originalName, details: { shareToken: token }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
    }
  } catch {}

  if (file.isFolder) {
    const children = await prepare('SELECT id, name, originalName, mimeType, size, isFolder, folderId, createdAt FROM files WHERE folderId = $? AND deletedAt IS NULL ORDER BY isFolder DESC, name ASC').all(file.id) as FileEntry[];
    res.json({
      isFolder: true,
      folder: {
        id: file.id,
        name: file.originalName,
      },
      permission: share.permission,
      allowUpload: share.allowUpload,
      files: children.map(c => ({
        id: c.id,
        name: c.originalName,
        mimeType: c.mimeType,
        size: c.size,
        isFolder: c.isFolder,
        folderId: c.folderId,
      })),
      expiresAt: share.expiresAt,
    });
    return;
  }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  res.json({
    file: {
      id: file.id,
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    },
    downloadUrl: `/api/share/download/${token}`,
    expiresAt: share.expiresAt,
  });
});

router.get('/access/:token/files', async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const query = req.query as { password?: string; folderId?: string };
  const password = query.password;
  const folderId = query.folderId;

  const { share, error } = await verifyShareAccess(token, password);
  if (error) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  const file = await prepare('SELECT * FROM files WHERE id = $?').get(share.fileId) as FileEntry | undefined;
  if (!file || !file.isFolder) {
    res.status(400).json({ error: 'Not a shared folder' });
    return;
  }

  const parentId = folderId ? folderId as string : share.fileId;
  const children = await prepare('SELECT id, name, originalName, mimeType, size, isFolder, folderId, createdAt FROM files WHERE folderId = $? AND deletedAt IS NULL ORDER BY isFolder DESC, name ASC').all(parentId) as FileEntry[];

  res.json({
    permission: share.permission,
    allowUpload: share.allowUpload,
    files: children.map(c => ({
      id: c.id,
      name: c.originalName,
      mimeType: c.mimeType,
      size: c.size,
      isFolder: c.isFolder,
      folderId: c.folderId,
    })),
  });
});

router.get('/download/:token', async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const query = req.query as { password?: string };
  const password = query.password;

  const { share, error } = await verifyShareAccess(token, password);
  if (error) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (share.permission === 'view') {
    res.status(403).json({ error: 'Download not allowed' });
    return;
  }

  const file = await prepare('SELECT * FROM files WHERE id = $?').get(share.fileId) as FileEntry | undefined;
  if (!file || (!file.isFolder && !fs.existsSync(file.path))) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await prepare('UPDATE share_links SET downloads = downloads + 1 WHERE id = $?').run(share.id);

  if (file.isFolder) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    const addFolderToZip = async (folderId: string, zipPath: string) => {
      const entries = await prepare('SELECT * FROM files WHERE folderId = $? AND deletedAt IS NULL ORDER BY isFolder DESC, name ASC').all(folderId) as any[];
      for (const entry of entries) {
        if (entry.isFolder) {
          await addFolderToZip(entry.id, zipPath + entry.originalName + '/');
        } else if (fs.existsSync(entry.path)) {
          zip.addLocalFile(entry.path, zipPath);
        }
      }
    };
    const entries = await prepare('SELECT * FROM files WHERE folderId = $? AND deletedAt IS NULL').all(file.id) as any[];
    for (const entry of entries) {
      if (entry.isFolder) {
        await addFolderToZip(entry.id, entry.originalName + '/');
      } else if (fs.existsSync(entry.path)) {
        zip.addLocalFile(entry.path);
      }
    }
    const zipBuf = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}.zip"`);
    res.send(zipBuf);
    return;
  }

  res.download(file.path, file.originalName);
});

router.post('/upload/:token', async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const query = req.query as { password?: string };
  const password = query.password;

  const { share, error } = await verifyShareAccess(token, password);
  if (error) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (!share.isFolder || !share.allowUpload) {
    res.status(403).json({ error: 'Upload not allowed' });
    return;
  }

  const file = await prepare('SELECT * FROM files WHERE id = $?').get(share.fileId) as FileEntry | undefined;
  if (!file || !file.isFolder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const multer = require('multer');
  const upload = multer({ dest: path.join(UPLOAD_DIR_PATH, 'temp') }).single('file');

  upload(req, res, async (err: any) => {
    if (err) { res.status(400).json({ error: 'Upload failed' }); return; }
    const uploadedFile = req.file;
    if (!uploadedFile) { res.status(400).json({ error: 'No file provided' }); return; }

    const ownerId = file.userId;
    const userDir = path.join(UPLOAD_DIR_PATH, ownerId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const newId = uuidv4();
    const ext = path.extname(uploadedFile.originalname);
    const safeName = `${newId}${ext}`;
    const newPath = path.join(userDir, safeName).replace(/\\/g, '/');
    fs.renameSync(uploadedFile.path, newPath);

    const now = new Date().toISOString();
    await prepare(`
      INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
      VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, NOW(), NOW())
    `).run(newId, safeName, uploadedFile.originalname, uploadedFile.mimetype || 'application/octet-stream', uploadedFile.size, newPath, share.fileId, ownerId, false);

    try {
      await logActivity({ userId: ownerId, action: 'share_upload', itemType: 'file', itemId: newId, itemName: uploadedFile.originalname, details: { shareToken: token }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
    } catch {}

    res.status(201).json({ message: 'File uploaded', id: newId, name: uploadedFile.originalname });
  });
});

export default router;
