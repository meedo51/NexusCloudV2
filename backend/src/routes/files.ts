import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import db from '../database';
import { authenticateToken } from '../middleware/auth';
import { upload, UPLOAD_DIR_PATH } from '../middleware/upload';
import { FileEntry } from '../types';

const router = Router();

router.use(authenticateToken);

router.get('/', (req: Request, res: Response) => {
  const { folderId, search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const userId = req.user!.userId;

  let sql = 'SELECT * FROM files WHERE userId = ?';
  const params: any[] = [userId];

  if (folderId) {
    sql += ' AND folderId = ?';
    params.push(folderId);
  } else {
    sql += ' AND folderId IS NULL';
  }

  if (search) {
    sql += ' AND (name LIKE ? OR originalName LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (type) {
    sql += ' AND mimeType LIKE ?';
    params.push(`${type}%`);
  }

  const allowedSortFields = ['name', 'size', 'createdAt', 'updatedAt'];
  const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  sql += ` ORDER BY isFolder DESC, ${sortField} ${order}`;

  const files = db.prepare(sql).all(...params);
  res.json(files);
});

router.get('/all-folders', (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const folders = db.prepare(
    'SELECT id, name, folderId as parentId FROM files WHERE userId = ? AND isFolder = 1 ORDER BY name'
  ).all(userId);
  res.json(folders);
});

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { folderId } = req.body;
  const userId = req.user!.userId;
  const id = uuidv4();

  const file = req.file;
  const fileEntry = {
    id,
    name: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path.replace(/\\/g, '/'),
    folderId: folderId || null,
    userId,
    isFolder: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, fileEntry.name, fileEntry.originalName, fileEntry.mimeType, fileEntry.size, fileEntry.path, fileEntry.folderId, fileEntry.userId, 0, fileEntry.createdAt, fileEntry.updatedAt);

  res.status(201).json(fileEntry);
});

router.post('/folder', (req: Request, res: Response) => {
  const { name, parentId } = req.body;
  const userId = req.user!.userId;

  if (!name) {
    res.status(400).json({ error: 'Folder name is required' });
    return;
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, name, 'application/folder', 0, '', parentId || null, userId, 1, createdAt, createdAt);

  const folder = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  res.status(201).json(folder);
});

router.put('/:id/rename', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user!.userId;

  if (!name) {
    res.status(400).json({ error: 'New name is required' });
    return;
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const updatedAt = new Date().toISOString();

  if (file.isFolder) {
    db.prepare('UPDATE files SET name = ?, originalName = ?, updatedAt = ? WHERE id = ?').run(name, name, updatedAt, id);
  } else {
    const ext = path.extname(file.name);
    const newName = name.endsWith(ext) ? name : `${name}${ext}`;
    const oldPath = file.path;
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);

    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    db.prepare('UPDATE files SET name = ?, originalName = ?, path = ?, updatedAt = ? WHERE id = ?')
      .run(newName, newName, newPath.replace(/\\/g, '/'), updatedAt, id);
  }

  const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.isFolder) {
    const children = db.prepare('SELECT * FROM files WHERE folderId = ?').all(id) as FileEntry[];
    for (const child of children) {
      if (!child.isFolder && fs.existsSync(child.path)) {
        fs.unlinkSync(child.path);
      }
    }
    db.prepare('DELETE FROM files WHERE folderId = ?').run(id);
  }

  if (!file.isFolder && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  db.prepare('DELETE FROM files WHERE id = ?').run(id);
  res.json({ message: 'File deleted successfully' });
});

router.get('/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  res.download(file.path, file.originalName);
});

router.get('/:id/download-zip', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const folder = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ? AND isFolder = ?')
    .get(id, userId, 1) as FileEntry | undefined;

  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

  archive.pipe(res);

  const addFilesToArchive = (folderId: string, archivePath: string) => {
    const entries = db.prepare(
      'SELECT * FROM files WHERE folderId = ? AND userId = ?'
    ).all(folderId, userId) as FileEntry[];

    for (const entry of entries) {
      if (entry.isFolder) {
        addFilesToArchive(entry.id, path.join(archivePath, entry.name));
      } else if (fs.existsSync(entry.path)) {
        archive.file(entry.path, { name: path.join(archivePath, entry.originalName) });
      }
    }
  };

  const rootEntries = db.prepare(
    'SELECT * FROM files WHERE folderId = ? AND userId = ?'
  ).all(id, userId) as FileEntry[];

  for (const entry of rootEntries) {
    if (entry.isFolder) {
      addFilesToArchive(entry.id, entry.name);
    } else if (fs.existsSync(entry.path)) {
      archive.file(entry.path, { name: entry.originalName });
    }
  }

  archive.finalize();
});

router.get('/:id/preview', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  const previewableTypes = [
    'image/', 'application/pdf', 'text/', 'application/json',
  ];

  const canPreview = previewableTypes.some(t => file.mimeType.startsWith(t));

  if (!canPreview) {
    res.status(400).json({ error: 'File type not previewable' });
    return;
  }

  if (file.mimeType.startsWith('image/')) {
    res.sendFile(file.path);
  } else if (file.mimeType === 'application/pdf') {
    res.sendFile(file.path);
  } else {
    const content = fs.readFileSync(file.path, 'utf-8');
    res.json({ content, mimeType: file.mimeType, name: file.originalName });
  }
});

router.put('/:id/move', (req: Request, res: Response) => {
  const { id } = req.params;
  const { folderId } = req.body;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (folderId) {
    if (folderId === id) {
      res.status(400).json({ error: 'Cannot move into itself' });
      return;
    }
    const targetFolder = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ? AND isFolder = ?')
      .get(folderId, userId, 1);
    if (!targetFolder) {
      res.status(404).json({ error: 'Target folder not found' });
      return;
    }
  }

  const updatedAt = new Date().toISOString();
  db.prepare('UPDATE files SET folderId = ?, updatedAt = ? WHERE id = ?')
    .run(folderId || null, updatedAt, id);

  const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  res.json(updated);
});

router.get('/:id/details', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File or folder not found' });
    return;
  }

  let itemCount = 0;
  if (file.isFolder) {
    const result = db.prepare('SELECT COUNT(*) as count FROM files WHERE folderId = ?').get(id) as any;
    itemCount = result.count;
  }

  res.json({
    ...file,
    itemCount,
  });
});

export default router;
