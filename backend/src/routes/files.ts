import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
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
  `).run(...Object.values(fileEntry));

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
  `).run(id, name, name, 'application/folder', 0, '', parentId || null, userId, true, createdAt, createdAt);

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
    db.prepare('UPDATE files SET name = ?, updatedAt = ? WHERE id = ?').run(name, updatedAt, id);
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
    const targetFolder = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ? AND isFolder = ?')
      .get(folderId, userId, true);
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

export default router;
