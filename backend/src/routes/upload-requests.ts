import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { prepare, recalculateUsedStorage, checkQuota, isFileTypeAllowed } from '../database';
import { authenticateToken } from '../middleware/auth';
import { upload, UPLOAD_DIR_PATH, fixOriginalName } from '../middleware/upload';
import { FileEntry, UploadRequest } from '../types';

const router = Router();

function generateToken(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { folderId, maxSizeBytes, allowedTypes, expiresInHours = 24 } = req.body;
  const userId = req.user!.userId;

  if (!folderId) { res.status(400).json({ error: 'folderId is required' }); return; }

  const folder = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND isFolder = $?').get(folderId, userId, true) as FileEntry | undefined;
  if (!folder) { res.status(404).json({ error: 'Folder not found' }); return; }

  const id = uuidv4();
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (parseInt(expiresInHours as string, 10) || 24));

  await prepare(`
    INSERT INTO upload_requests (id, createdBy, folderId, token, expiresAt, maxSizeBytes, allowedTypes)
    VALUES ($?, $?, $?, $?, $?, $?, $?)
  `).run(id, userId, folderId, token, expiresAt.toISOString(), maxSizeBytes || 52428800, JSON.stringify(allowedTypes || []));

  const request = await prepare('SELECT * FROM upload_requests WHERE id = $?').get(id);
  res.status(201).json(request);
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const requests = await prepare(
    'SELECT ur.*, f.name as folderName FROM upload_requests ur JOIN files f ON ur.folderId = f.id WHERE ur.createdBy = $? ORDER BY ur.createdAt DESC'
  ).all(userId);
  res.json(requests);
});

router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const requests = await prepare(
    'SELECT ur.*, f.name as folderName FROM upload_requests ur JOIN files f ON ur.folderId = f.id WHERE ur.createdBy = $? ORDER BY ur.createdAt DESC'
  ).all(userId);
  res.json(requests);
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const request = await prepare('SELECT * FROM upload_requests WHERE id = $? AND createdBy = $?').get(id, userId) as UploadRequest | undefined;
  if (!request) { res.status(404).json({ error: 'Upload request not found' }); return; }
  await prepare('DELETE FROM upload_requests WHERE id = $?').run(id);
  res.json({ message: 'Upload request deleted' });
});

router.get('/access/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const request = await prepare('SELECT * FROM upload_requests WHERE token = $?').get(token) as UploadRequest | undefined;
  if (!request) { res.status(404).json({ error: 'Upload link not found' }); return; }
  if (new Date(request.expiresAt) < new Date()) { res.status(410).json({ error: 'Upload link has expired' }); return; }

  const folder = await prepare('SELECT id, name FROM files WHERE id = $?').get(request.folderId) as any;
  res.json({
    folderName: folder?.name || 'Unknown',
    maxSizeBytes: request.maxSizeBytes,
    allowedTypes: (() => { try { return JSON.parse(request.allowedTypes); } catch { return []; } })(),
    expiresAt: request.expiresAt,
  });
});

router.post('/upload/:token', upload.single('file'), async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const request = await prepare('SELECT * FROM upload_requests WHERE token = $?').get(token) as UploadRequest | undefined;
  if (!request) { fs.unlinkSync(req.file.path); res.status(404).json({ error: 'Upload link not found' }); return; }
  if (new Date(request.expiresAt) < new Date()) { fs.unlinkSync(req.file.path); res.status(410).json({ error: 'Upload link has expired' }); return; }

  const allowedTypes = (() => { try { return JSON.parse(request.allowedTypes); } catch { return []; } })();
  if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    res.status(403).json({ error: `File type ${req.file.mimetype} not allowed` });
    return;
  }

  const originalName = fixOriginalName(req.file.originalname);
  const ext = path.extname(originalName).toLowerCase();
  if (ext && !(await isFileTypeAllowed(ext))) {
    fs.unlinkSync(req.file.path);
    res.status(403).json({ error: `Upload of ${ext} files is disabled by administrator` });
    return;
  }

  if (req.file.size > request.maxSizeBytes) {
    fs.unlinkSync(req.file.path);
    res.status(403).json({ error: `File exceeds max size of ${request.maxSizeBytes} bytes` });
    return;
  }

  const q = await checkQuota(request.createdBy, req.file.size);
  if (!q.allowed) { fs.unlinkSync(req.file.path); res.status(403).json({ error: 'Owner storage quota exceeded' }); return; }

  const id = uuidv4();
  const now = new Date().toISOString();
  const fileEntry = {
    id,
    name: req.file.filename,
    originalName,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path.replace(/\\/g, '/'),
    folderId: request.folderId,
    userId: request.createdBy,
    isFolder: false,
    createdAt: now,
    updatedAt: now,
  };

  await prepare(`
    INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
    VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)
  `).run(fileEntry.id, fileEntry.name, fileEntry.originalName, fileEntry.mimeType, fileEntry.size, fileEntry.path, fileEntry.folderId, fileEntry.userId, false, fileEntry.createdAt, fileEntry.updatedAt);

  await recalculateUsedStorage(request.createdBy);
  res.status(201).json(fileEntry);
});

export default router;
