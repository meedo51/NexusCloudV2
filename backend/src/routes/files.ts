import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
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

router.post('/create', (req: Request, res: Response) => {
  const { name, content, folderId } = req.body;
  const userId = req.user!.userId;

  if (!name) {
    res.status(400).json({ error: 'File name is required' });
    return;
  }

  const id = uuidv4();
  const userDir = path.join(UPLOAD_DIR_PATH, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const safeName = `${id}${path.extname(name) || '.txt'}`;
  const filePath = path.join(userDir, safeName).replace(/\\/g, '/');

  fs.writeFileSync(filePath, content || '', 'utf-8');

  const mimeType = name.endsWith('.md') ? 'text/markdown' :
    name.endsWith('.html') ? 'text/html' :
    name.endsWith('.css') ? 'text/css' :
    name.endsWith('.js') ? 'text/javascript' :
    name.endsWith('.json') ? 'application/json' :
    name.endsWith('.py') ? 'text/x-python' :
    name.endsWith('.ts') ? 'text/typescript' :
    name.endsWith('.tsx') ? 'text/typescript' :
    name.endsWith('.jsx') ? 'text/javascript' :
    name.endsWith('.yaml') || name.endsWith('.yml') ? 'text/yaml' :
    name.endsWith('.xml') ? 'text/xml' :
    name.endsWith('.sql') ? 'text/sql' :
    name.endsWith('.sh') ? 'text/x-shellscript' :
    'text/plain';

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, safeName, name, mimeType, Buffer.byteLength(content || '', 'utf-8'), filePath, folderId || null, userId, 0, now, now);

  const created = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.get('/:id/content', (req: Request, res: Response) => {
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

  const content = fs.readFileSync(file.path, 'utf-8');
  res.json({ content, mimeType: file.mimeType, name: file.originalName });
});

router.put('/:id/content', (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user!.userId;

  if (content === undefined) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  fs.writeFileSync(file.path, content, 'utf-8');
  const updatedAt = new Date().toISOString();
  db.prepare('UPDATE files SET size = ?, updatedAt = ? WHERE id = ?')
    .run(Buffer.byteLength(content, 'utf-8'), updatedAt, id);

  const updated = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  res.json(updated);
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

  const rootEntries = db.prepare(
    'SELECT * FROM files WHERE folderId = ? AND userId = ?'
  ).all(id, userId) as FileEntry[];

  for (const entry of rootEntries) {
    if (entry.isFolder) {
      addFilesToArchive(entry.id, entry.name, userId, archive);
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

function addFilesToArchive(folderId: string, archivePath: string, userId: string, archive: archiver.Archiver) {
  const entries = db.prepare(
    'SELECT * FROM files WHERE folderId = ? AND userId = ?'
  ).all(folderId, userId) as FileEntry[];

  for (const entry of entries) {
    if (entry.isFolder) {
      addFilesToArchive(entry.id, path.join(archivePath, entry.name), userId, archive);
    } else if (fs.existsSync(entry.path)) {
      archive.file(entry.path, { name: path.join(archivePath, entry.originalName) });
    }
  }
}

router.post('/batch/zip', (req: Request, res: Response) => {
  const { ids, zipName } = req.body;
  const userId = req.user!.userId;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'File IDs are required' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const entries = db.prepare(
    `SELECT * FROM files WHERE id IN (${placeholders}) AND userId = ?`
  ).all(...ids, userId) as FileEntry[];

  const archive = archiver('zip', { zlib: { level: 9 } });
  const name = (zipName || 'batch-export').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);

  archive.pipe(res);

  for (const entry of entries) {
    if (entry.isFolder) {
      addFilesToArchive(entry.id, entry.name, userId, archive);
    } else if (fs.existsSync(entry.path)) {
      archive.file(entry.path, { name: entry.originalName });
    }
  }

  archive.finalize();
});

router.post('/batch/save-zip', (req: Request, res: Response) => {
  const { ids, zipName, folderId } = req.body;
  const userId = req.user!.userId;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'File IDs are required' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const entries = db.prepare(
    `SELECT * FROM files WHERE id IN (${placeholders}) AND userId = ?`
  ).all(...ids, userId) as FileEntry[];

  const name = (zipName || 'batch-export').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zipId = uuidv4();
  const userDir = path.join(UPLOAD_DIR_PATH, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const zipPath = path.join(userDir, `${zipId}.zip`).replace(/\\/g, '/');

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);

  for (const entry of entries) {
    if (entry.isFolder) {
      addFilesToArchive(entry.id, entry.name, userId, archive);
    } else if (fs.existsSync(entry.path)) {
      archive.file(entry.path, { name: entry.originalName });
    }
  }

  output.on('close', () => {
    const now = new Date().toISOString();
    const zipFile = {
      id: zipId,
      name: `${zipId}.zip`,
      originalName: `${name}.zip`,
      mimeType: 'application/zip',
      size: archive.pointer(),
      path: zipPath,
      folderId: folderId || null,
      userId,
      isFolder: false,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(zipFile.id, zipFile.name, zipFile.originalName, zipFile.mimeType, zipFile.size, zipFile.path, zipFile.folderId, zipFile.userId, 0, zipFile.createdAt, zipFile.updatedAt);

    res.status(201).json(zipFile);
  });

  archive.on('error', (err: any) => {
    res.status(500).json({ error: `Failed to create zip: ${err.message}` });
  });

  archive.finalize();
});

router.post('/batch/delete', (req: Request, res: Response) => {
  const { ids } = req.body;
  const userId = req.user!.userId;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'File IDs are required' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const entries = db.prepare(
    `SELECT * FROM files WHERE id IN (${placeholders}) AND userId = ?`
  ).all(...ids, userId) as FileEntry[];

  for (const entry of entries) {
    if (entry.isFolder) {
      const children = db.prepare('SELECT * FROM files WHERE folderId = ?').all(entry.id) as FileEntry[];
      for (const child of children) {
        if (!child.isFolder && fs.existsSync(child.path)) fs.unlinkSync(child.path);
      }
      db.prepare('DELETE FROM files WHERE folderId = ?').run(entry.id);
    }
    if (!entry.isFolder && fs.existsSync(entry.path)) {
      fs.unlinkSync(entry.path);
    }
  }

  const deletePlaceholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM files WHERE id IN (${deletePlaceholders}) AND userId = ?`).run(...ids, userId);

  res.json({ message: `${entries.length} items deleted successfully` });
});

router.post('/batch/move', (req: Request, res: Response) => {
  const { ids, folderId } = req.body;
  const userId = req.user!.userId;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'File IDs are required' });
    return;
  }

  if (folderId) {
    const targetFolder = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ? AND isFolder = ?')
      .get(folderId, userId, 1);
    if (!targetFolder) {
      res.status(404).json({ error: 'Target folder not found' });
      return;
    }
  }

  const updatedAt = new Date().toISOString();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(
    `UPDATE files SET folderId = ?, updatedAt = ? WHERE id IN (${placeholders}) AND userId = ?`
  ).run(folderId || null, updatedAt, ...ids, userId);

  res.json({ message: `${ids.length} items moved successfully` });
});

function deepCopyEntry(entryId: string, destFolderId: string | null, userId: string): void {
  const entry = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(entryId, userId) as FileEntry | undefined;
  if (!entry) return;

  const newId = uuidv4();
  const now = new Date().toISOString();

  if (entry.isFolder) {
    db.prepare(`
      INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, entry.name, entry.name, 'application/folder', 0, '', destFolderId, userId, 1, now, now);

    const children = db.prepare('SELECT * FROM files WHERE folderId = ? AND userId = ?').all(entryId, userId) as FileEntry[];
    for (const child of children) {
      deepCopyEntry(child.id, newId, userId);
    }
  } else {
    const ext = path.extname(entry.name);
    const safeName = `${newId}${ext}`;
    const userDir = path.join(UPLOAD_DIR_PATH, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    const newPath = path.join(userDir, safeName).replace(/\\/g, '/');

    if (fs.existsSync(entry.path)) {
      fs.copyFileSync(entry.path, newPath);
    }

    db.prepare(`
      INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, safeName, entry.originalName, entry.mimeType, entry.size, newPath, destFolderId, userId, 0, now, now);
  }
}

router.post('/batch/copy', (req: Request, res: Response) => {
  const { ids, folderId } = req.body;
  const userId = req.user!.userId;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'File IDs are required' });
    return;
  }

  if (folderId) {
    const targetFolder = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ? AND isFolder = ?')
      .get(folderId, userId, 1);
    if (!targetFolder) {
      res.status(404).json({ error: 'Target folder not found' });
      return;
    }
  }

  for (const id of ids) {
    deepCopyEntry(id, folderId || null, userId);
  }

  res.json({ message: `${ids.length} items copied successfully` });
});

router.post('/:id/extract', (req: Request, res: Response) => {
  const { id } = req.params;
  const { destFolderId } = req.body;
  const userId = req.user!.userId;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!file.mimeType.startsWith('application/zip') && !file.mimeType.startsWith('application/x-zip') && !file.name.endsWith('.zip')) {
    res.status(400).json({ error: 'Not a supported archive file' });
    return;
  }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  try {
    const zip = new AdmZip(file.path);
    const entries = zip.getEntries();
    const created: any[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) {
        const folderId = uuidv4();
        const now = new Date().toISOString();
        const folderName = entry.entryName.replace(/\/$/, '').split('/').pop() || 'folder';
        const parentFolderId = destFolderId || null;

        db.prepare(`
          INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(folderId, folderName, folderName, 'application/folder', 0, '', parentFolderId, userId, 1, now, now);

        created.push({ id: folderId, name: folderName, isFolder: true });
      } else {
        const fileId = uuidv4();
        const now = new Date().toISOString();
        const originalName = entry.entryName.split('/').pop() || entry.entryName;
        const ext = path.extname(originalName);
        const safeName = `${fileId}${ext}`;
        const userDir = path.join(UPLOAD_DIR_PATH, userId);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        const filePath = path.join(userDir, safeName).replace(/\\/g, '/');

        fs.writeFileSync(filePath, entry.getData());

        const mimeType = ext === '.md' ? 'text/markdown' :
          ext === '.html' ? 'text/html' :
          ext === '.css' ? 'text/css' :
          ext === '.js' ? 'text/javascript' :
          ext === '.json' ? 'application/json' :
          ext === '.py' ? 'text/x-python' :
          ext === '.ts' ? 'text/typescript' :
          ext === '.txt' ? 'text/plain' :
          'application/octet-stream';

        db.prepare(`
          INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(fileId, safeName, originalName, mimeType, entry.header.size, filePath, destFolderId || null, userId, 0, now, now);

        created.push({ id: fileId, name: originalName, isFolder: false });
      }
    }

    res.json({ message: `Extracted ${entries.length} entries`, files: created });
  } catch (err: any) {
    res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

export default router;
