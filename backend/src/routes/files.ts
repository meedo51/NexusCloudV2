import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { prepare, checkQuota, recalculateUsedStorage, logActivity, isFileTypeAllowed } from '../database';
import { authenticateToken } from '../middleware/auth';
import { upload, UPLOAD_DIR_PATH } from '../middleware/upload';
import { FileEntry } from '../types';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  const { folderId, search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const userId = req.user!.userId;
  let sql = 'SELECT * FROM files WHERE userId = $? AND deletedAt IS NULL';
  const params: any[] = [userId];
  if (folderId) { sql += ' AND folderId = $?'; params.push(folderId); }
  else { sql += ' AND folderId IS NULL'; }
  if (search) { sql += ' AND (name ILIKE $? OR originalName ILIKE $?)'; params.push(`%${search}%`, `%${search}%`); }
  if (type) { sql += ' AND mimeType LIKE $?'; params.push(`${type}%`); }
  const allowedSortFields = ['name', 'size', 'createdAt', 'updatedAt'];
  const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY isFolder DESC, ${sortField} ${order}`;
  const files = await prepare(sql).all(...params);
  res.json(files);
});

router.get('/trash', async (req: Request, res: Response) => {
  const { sortBy = 'deletedAt', sortOrder = 'desc' } = req.query;
  const userId = req.user!.userId;
  const allowedSortFields = ['name', 'size', 'deletedAt', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'deletedAt';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const files = await prepare(
    `SELECT * FROM files WHERE userId = $? AND deletedAt IS NOT NULL ORDER BY isFolder DESC, ${sortField} ${order}`
  ).all(userId);
  res.json(files);
});

router.post('/trash/purge-old', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldFiles = await prepare(
    'SELECT * FROM files WHERE userId = $? AND deletedAt IS NOT NULL AND deletedAt < $?'
  ).all(userId, cutoff) as FileEntry[];
  for (const file of oldFiles) {
    if (!file.isFolder && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (file.isFolder) {
      const descendants = await prepare("SELECT * FROM files WHERE folderId = $? AND userId = $?").all(file.id, userId) as FileEntry[];
      for (const d of descendants) { if (!d.isFolder && fs.existsSync(d.path)) fs.unlinkSync(d.path); }
      await prepare("DELETE FROM files WHERE folderId = $? AND userId = $?").run(file.id, userId);
    }
    await prepare('DELETE FROM files WHERE id = $? AND userId = $?').run(file.id, userId);
  }
  await recalculateUsedStorage(userId);
  res.json({ message: `Purged ${oldFiles.length} old items from trash` });
});

router.post('/trash/purge', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const trashFiles = await prepare('SELECT * FROM files WHERE userId = $? AND deletedAt IS NOT NULL').all(userId) as FileEntry[];
  for (const file of trashFiles) {
    if (!file.isFolder && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (file.isFolder) {
      const descendants = await prepare("SELECT * FROM files WHERE folderId = $? AND userId = $?").all(file.id, userId) as FileEntry[];
      for (const d of descendants) { if (!d.isFolder && fs.existsSync(d.path)) fs.unlinkSync(d.path); }
      await prepare("DELETE FROM files WHERE folderId = $? AND userId = $?").run(file.id, userId);
    }
    await prepare('DELETE FROM files WHERE id = $? AND userId = $?').run(file.id, userId);
  }
  await recalculateUsedStorage(userId);
  res.json({ message: `Trash emptied (${trashFiles.length} items)` });
});

router.get('/search', async (req: Request, res: Response) => {
  const { q, type } = req.query;
  const userId = req.user!.userId;
  if (!q) { res.json([]); return; }
  let sql = 'SELECT * FROM files WHERE userId = $? AND deletedAt IS NULL AND (name ILIKE $? OR originalName ILIKE $?)';
  const params: any[] = [userId, `%${q}%`, `%${q}%`];
  if (type) { sql += ' AND mimeType LIKE $?'; params.push(`${type}%`); }
  sql += ' ORDER BY isFolder DESC, createdAt DESC LIMIT 100';
  const files = await prepare(sql).all(...params) as FileEntry[];
  const results = [];
  for (const f of files) {
    const breadcrumb: { id: string; name: string }[] = [];
    let current = f.folderId;
    while (current) {
      const parent = await prepare('SELECT id, name FROM files WHERE id = $? AND userId = $?').get(current, userId) as any;
      if (!parent) break;
      breadcrumb.unshift({ id: parent.id, name: parent.name });
      current = parent.folderId;
    }
    results.push({ ...f, parentPath: breadcrumb });
  }
  res.json(results);
});

router.get('/breadcrumb', async (req: Request, res: Response) => {
  const { folderId } = req.query;
  const userId = req.user!.userId;
  const breadcrumb: { id: string; name: string }[] = [];
  let current = folderId as string | null;
  while (current) {
    const folder = await prepare('SELECT id, name FROM files WHERE id = $? AND userId = $? AND isFolder = TRUE').get(current, userId) as any;
    if (!folder) break;
    breadcrumb.unshift({ id: folder.id, name: folder.name });
    current = folder.folderId;
  }
  res.json(breadcrumb);
});

router.get('/favorites', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const favorites = await prepare(`
    SELECT f.* FROM favorites f JOIN files fi ON f.itemId = fi.id
    WHERE f.userId = $? AND fi.deletedAt IS NULL ORDER BY f.createdAt DESC
  `).all(userId) as any[];
  const items = [];
  for (const fav of favorites) {
    const item = await prepare('SELECT * FROM files WHERE id = $?').get(fav.itemId) as FileEntry | undefined;
    if (item) items.push({ ...fav, item });
  }
  res.json(items);
});

router.get('/quota', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const q = await checkQuota(userId, 0);
  res.json({ used: q.used, quota: q.quota, remaining: q.remaining, percent: Math.round((q.used / q.quota) * 100) });
});

router.get('/all-folders', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const folders = await prepare(
    "SELECT id, name, folderId as \"parentId\" FROM files WHERE userId = $? AND isFolder = TRUE AND deletedAt IS NULL ORDER BY name"
  ).all(userId);
  res.json(folders);
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext && !(await isFileTypeAllowed(ext))) {
    fs.unlinkSync(req.file.path);
    res.status(403).json({ error: `Upload of ${ext} files is disabled by administrator` });
    return;
  }
  const { folderId } = req.body;
  const userId = req.user!.userId;
  const q = await checkQuota(userId, req.file.size);
  if (!q.allowed) { fs.unlinkSync(req.file.path); res.status(403).json({ error: `Storage quota exceeded. ${q.remaining} bytes remaining` }); return; }
  const id = uuidv4();
  const file = req.file;
  const fileEntry = { id, name: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size, path: file.path.replace(/\\/g, '/'), folderId: folderId || null, userId, isFolder: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(id, fileEntry.name, fileEntry.originalName, fileEntry.mimeType, fileEntry.size, fileEntry.path, fileEntry.folderId, fileEntry.userId, false, fileEntry.createdAt, fileEntry.updatedAt);
  await recalculateUsedStorage(userId);
  await logActivity({ userId, action: 'upload', itemType: 'file', itemId: String(id), itemName: fileEntry.originalName, details: { size: fileEntry.size, mimeType: fileEntry.mimeType }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.status(201).json(fileEntry);
});

router.post('/folder', async (req: Request, res: Response) => {
  const { name, parentId } = req.body;
  const userId = req.user!.userId;
  if (!name) { res.status(400).json({ error: 'Folder name is required' }); return; }
  const id = uuidv4();
  const now = new Date().toISOString();
  await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(id, name, name, 'application/folder', 0, '', parentId || null, userId, true, now, now);
  const folder = await prepare('SELECT * FROM files WHERE id = $?').get(id);
  res.status(201).json(folder);
});

router.post('/create', async (req: Request, res: Response) => {
  const { name, content, folderId } = req.body;
  const userId = req.user!.userId;
  if (!name) { res.status(400).json({ error: 'File name is required' }); return; }
  const ext = path.extname(name).toLowerCase();
  if (ext && !(await isFileTypeAllowed(ext))) {
    res.status(403).json({ error: `Creation of ${ext} files is disabled by administrator` });
    return;
  }
  const byteLen = Buffer.byteLength(content || '', 'utf-8');
  const q = await checkQuota(userId, byteLen);
  if (!q.allowed) { res.status(403).json({ error: `Storage quota exceeded. ${q.remaining} bytes remaining` }); return; }
  const id = uuidv4();
  const userDir = path.join(UPLOAD_DIR_PATH, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const safeName = `${id}${path.extname(name) || '.txt'}`;
  const filePath = path.join(userDir, safeName).replace(/\\/g, '/');
  fs.writeFileSync(filePath, content || '', 'utf-8');
  const mimeType = name.endsWith('.md') ? 'text/markdown' : name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : name.endsWith('.json') ? 'application/json' : name.endsWith('.py') ? 'text/x-python' : name.endsWith('.ts') || name.endsWith('.tsx') ? 'text/typescript' : name.endsWith('.jsx') ? 'text/javascript' : name.endsWith('.yaml') || name.endsWith('.yml') ? 'text/yaml' : name.endsWith('.xml') ? 'text/xml' : name.endsWith('.sql') ? 'text/sql' : name.endsWith('.sh') ? 'text/x-shellscript' : 'text/plain';
  const now = new Date().toISOString();
  await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(id, safeName, name, mimeType, byteLen, filePath, folderId || null, userId, false, now, now);
  await recalculateUsedStorage(userId);
  const created = await prepare('SELECT * FROM files WHERE id = $?').get(id);
  await logActivity({ userId, action: 'create', itemType: 'file', itemId: id, itemName: name, details: { folderId: folderId || null }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.status(201).json(created);
});

router.get('/:id/content', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  if (!fs.existsSync(file.path)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  const content = fs.readFileSync(file.path, 'utf-8');
  res.json({ content, mimeType: file.mimeType, name: file.originalName });
});

router.get('/:id/info', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  if (!fs.existsSync(file.path)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  const content = fs.readFileSync(file.path, 'utf-8');
  const lineCount = content.split('\n').length;
  res.json({
    id: file.id, name: file.name, originalName: file.originalName,
    mimeType: file.mimeType, size: file.size, lineCount,
    encoding: 'UTF-8', createdAt: file.createdAt, updatedAt: file.updatedAt,
  });
});

router.put('/:id/content', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { content } = req.body;
  const userId = req.user!.userId;
  if (content === undefined) { res.status(400).json({ error: 'Content is required' }); return; }
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  const newSize = Buffer.byteLength(content, 'utf-8');
  if (newSize > 5 * 1024 * 1024) { res.status(413).json({ error: 'File exceeds 5MB editing limit' }); return; }
  const sizeDiff = newSize - file.size;
  if (sizeDiff > 0) { const q = await checkQuota(userId, sizeDiff); if (!q.allowed) { res.status(403).json({ error: `Storage quota exceeded. ${q.remaining} bytes remaining` }); return; } }
  const maxVer = await prepare('SELECT MAX(versionNumber) as v FROM file_versions WHERE fileId = $?').get(id) as any;
  const nextVer = (maxVer?.v || 0) + 1;
  const versionId = uuidv4();
  await prepare('INSERT INTO file_versions (id, fileId, versionNumber, size, storagePath, createdBy, createdAt) VALUES ($?, $?, $?, $?, $?, $?, $?)').run(versionId, id, nextVer, file.size, file.path, userId, new Date().toISOString());
  fs.writeFileSync(file.path, content, 'utf-8');
  const updatedAt = new Date().toISOString();
  await prepare('UPDATE files SET size = $?, updatedAt = $? WHERE id = $?').run(newSize, updatedAt, id);
  await recalculateUsedStorage(userId);
  const updated = await prepare('SELECT * FROM files WHERE id = $?').get(id);
  res.json(updated);
});

router.put('/:id/rename', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name } = req.body;
  const userId = req.user!.userId;
  if (!name) { res.status(400).json({ error: 'New name is required' }); return; }
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  const updatedAt = new Date().toISOString();
  if (file.isFolder) {
    await prepare('UPDATE files SET name = $?, originalName = $?, updatedAt = $? WHERE id = $?').run(name, name, updatedAt, id);
  } else {
    const ext = path.extname(file.name);
    const newName = name.endsWith(ext) ? name : `${name}${ext}`;
    const dir = path.dirname(file.path);
    const newPath = path.join(dir, newName);
    if (fs.existsSync(file.path)) fs.renameSync(file.path, newPath);
    await prepare('UPDATE files SET name = $?, originalName = $?, path = $?, updatedAt = $? WHERE id = $?').run(newName, newName, newPath.replace(/\\/g, '/'), updatedAt, id);
  }
  const updated = await prepare('SELECT * FROM files WHERE id = $?').get(id);
  await logActivity({ userId, action: 'rename', itemType: file.isFolder ? 'folder' : 'file', itemId: id, itemName: name, details: { oldName: file.originalName || file.name }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json(updated);
});

async function softDeleteEntry(id: string, userId: string, deletedAt: string): Promise<void> {
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(id, userId) as FileEntry | undefined;
  if (!file) return;
  await prepare('UPDATE files SET deletedAt = $? WHERE id = $? AND userId = $?').run(deletedAt, id, userId);
  if (file.isFolder) {
    const children = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $?').all(id, userId) as FileEntry[];
    for (const child of children) await softDeleteEntry(child.id, userId, deletedAt);
  }
}

async function restoreEntry(id: string, userId: string): Promise<void> {
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(id, userId) as FileEntry | undefined;
  if (!file) return;
  await prepare('UPDATE files SET deletedAt = NULL WHERE id = $? AND userId = $?').run(id, userId);
  if (file.isFolder) {
    const children = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $?').all(id, userId) as FileEntry[];
    for (const child of children) await restoreEntry(child.id, userId);
  }
}

router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  const deletedAt = new Date().toISOString();
  await softDeleteEntry(id, userId, deletedAt);
  await recalculateUsedStorage(userId);
  await logActivity({ userId, action: 'delete', itemType: 'file', itemId: id, itemName: file.originalName || file.name, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json({ message: 'File moved to trash', deletedAt });
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NOT NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found in trash' }); return; }
  await restoreEntry(id, userId);
  await recalculateUsedStorage(userId);
  await logActivity({ userId, action: 'restore', itemType: 'file', itemId: id, itemName: file.originalName || file.name, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json({ message: 'File restored' });
});

router.post('/trash/restore-all', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const files = await prepare('SELECT * FROM files WHERE userId = $? AND deletedAt IS NOT NULL').all(userId) as FileEntry[];
  for (const file of files) {
    await restoreEntry(file.id, userId);
  }
  await recalculateUsedStorage(userId);
  res.json({ message: `${files.length} items restored` });
});

router.delete('/:id/permanent', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NOT NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found in trash' }); return; }
  if (file.isFolder) {
    const descendants = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $?').all(id, userId) as FileEntry[];
    for (const d of descendants) { if (!d.isFolder && fs.existsSync(d.path)) fs.unlinkSync(d.path); }
    await prepare("DELETE FROM files WHERE folderId = $? AND userId = $?").run(id, userId);
  }
  if (!file.isFolder && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  await prepare('DELETE FROM files WHERE id = $? AND userId = $?').run(id, userId);
  await recalculateUsedStorage(userId);
  await logActivity({ userId, action: 'permanent_delete', itemType: 'file', itemId: id, itemName: file.originalName || file.name, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json({ message: 'File permanently deleted' });
});

router.post('/:id/favorite', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  const existing = await prepare('SELECT id FROM favorites WHERE userId = $? AND itemId = $?').get(userId, id);
  if (existing) {
    await prepare('DELETE FROM favorites WHERE userId = $? AND itemId = $?').run(userId, id);
    res.json({ favorited: false });
  } else {
    const favId = uuidv4();
    await prepare('INSERT INTO favorites (id, userId, itemId) VALUES ($?, $?, $?)').run(favId, userId, id);
    res.json({ favorited: true });
  }
});

router.get('/:id/download', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  if (!fs.existsSync(file.path)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  await logActivity({ userId, action: 'download', itemType: 'file', itemId: id, itemName: file.originalName, details: { size: file.size }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.download(file.path, file.originalName);
});

router.get('/:id/download-zip', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const folder = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND isFolder = TRUE AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!folder) { res.status(404).json({ error: 'Folder not found' }); return; }
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
  archive.pipe(res);
  const rootEntries = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL').all(id, userId) as FileEntry[];
  for (const entry of rootEntries) {
    if (entry.isFolder) await addFilesToArchive(entry.id, entry.name, userId, archive);
    else if (fs.existsSync(entry.path)) archive.file(entry.path, { name: entry.originalName });
  }
  archive.finalize();
});

router.get('/:id/preview', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  if (!fs.existsSync(file.path)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  const previewableTypes = ['image/', 'application/pdf', 'text/', 'application/json'];
  const canPreview = previewableTypes.some(t => file.mimeType.startsWith(t));
  if (!canPreview) { res.status(400).json({ error: 'File type not previewable' }); return; }
  if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') res.sendFile(file.path);
  else { const content = fs.readFileSync(file.path, 'utf-8'); res.json({ content, mimeType: file.mimeType, name: file.originalName }); }
});

router.put('/:id/move', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { folderId } = req.body;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  if (folderId) {
    if (folderId === id) { res.status(400).json({ error: 'Cannot move into itself' }); return; }
    const targetFolder = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND isFolder = TRUE AND deletedAt IS NULL').get(folderId, userId);
    if (!targetFolder) { res.status(404).json({ error: 'Target folder not found' }); return; }
  }
  const updatedAt = new Date().toISOString();
  await prepare('UPDATE files SET folderId = $?, updatedAt = $? WHERE id = $?').run(folderId || null, updatedAt, id);
  const updated = await prepare('SELECT * FROM files WHERE id = $?').get(id);
  await logActivity({ userId, action: 'move', itemType: file.isFolder ? 'folder' : 'file', itemId: id, itemName: file.originalName || file.name, details: { from: file.folderId, to: folderId || null }, ipAddress: String(req.ip || ''), userAgent: String(req.headers['user-agent'] || '') });
  res.json(updated);
});

router.get('/:id/details', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File or folder not found' }); return; }
  let itemCount = 0;
  if (file.isFolder) {
    const result = await prepare('SELECT COUNT(*)::int as count FROM files WHERE folderId = $? AND deletedAt IS NULL').get(id) as any;
    itemCount = result.count;
  }
  res.json({ ...file, itemCount });
});

async function addFilesToArchive(folderId: string, archivePath: string, userId: string, archive: archiver.Archiver) {
  const entries = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL').all(folderId, userId) as FileEntry[];
  for (const entry of entries) {
    if (entry.isFolder) await addFilesToArchive(entry.id, path.join(archivePath, entry.name), userId, archive);
    else if (fs.existsSync(entry.path)) archive.file(entry.path, { name: path.join(archivePath, entry.originalName) });
  }
}

router.post('/batch/zip', async (req: Request, res: Response) => {
  const { ids, zipName } = req.body;
  const userId = req.user!.userId;
  if (!ids || !Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'File IDs are required' }); return; }
  const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');
  const entries = await prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND userId = $${ids.length + 1} AND deletedAt IS NULL`).all(...ids, userId) as FileEntry[];
  const archive = archiver('zip', { zlib: { level: 9 } });
  const name = (zipName || 'batch-export').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);
  archive.pipe(res);
  for (const entry of entries) {
    if (entry.isFolder) await addFilesToArchive(entry.id, entry.name, userId, archive);
    else if (fs.existsSync(entry.path)) archive.file(entry.path, { name: entry.originalName });
  }
  archive.finalize();
});

router.post('/batch/save-zip', async (req: Request, res: Response) => {
  const { ids, zipName, folderId } = req.body;
  const userId = req.user!.userId;
  if (!ids || !Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'File IDs are required' }); return; }
  const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');
  const entries = await prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND userId = $${ids.length + 1} AND deletedAt IS NULL`).all(...ids, userId) as FileEntry[];
  const name = (zipName || 'batch-export').replace(/[^a-zA-Z0-9_-]/g, '_');
  const zipId = uuidv4();
  const userDir = path.join(UPLOAD_DIR_PATH, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const zipPath = path.join(userDir, `${zipId}.zip`).replace(/\\/g, '/');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  for (const entry of entries) {
    if (entry.isFolder) await addFilesToArchive(entry.id, entry.name, userId, archive);
    else if (fs.existsSync(entry.path)) archive.file(entry.path, { name: entry.originalName });
  }
  output.on('close', async () => {
    const now = new Date().toISOString();
    const zipFile = { id: zipId, name: `${zipId}.zip`, originalName: `${name}.zip`, mimeType: 'application/zip', size: archive.pointer(), path: zipPath, folderId: folderId || null, userId, isFolder: false, createdAt: now, updatedAt: now };
    await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(zipFile.id, zipFile.name, zipFile.originalName, zipFile.mimeType, zipFile.size, zipFile.path, zipFile.folderId, zipFile.userId, false, zipFile.createdAt, zipFile.updatedAt);
    await recalculateUsedStorage(userId);
    res.status(201).json(zipFile);
  });
  archive.on('error', (err: any) => { res.status(500).json({ error: `Failed to create zip: ${err.message}` }); });
  archive.finalize();
});

router.post('/batch/delete', async (req: Request, res: Response) => {
  const { ids } = req.body;
  const userId = req.user!.userId;
  if (!ids || !Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'File IDs are required' }); return; }
  const deletedAt = new Date().toISOString();
  const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');
  const entries = await prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND userId = $${ids.length + 1} AND deletedAt IS NULL`).all(...ids, userId) as FileEntry[];
  for (const entry of entries) await softDeleteEntry(entry.id, userId, deletedAt);
  await recalculateUsedStorage(userId);
  res.json({ message: `${entries.length} items moved to trash` });
});

router.post('/batch/move', async (req: Request, res: Response) => {
  const { ids, folderId } = req.body;
  const userId = req.user!.userId;
  if (!ids || !Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'File IDs are required' }); return; }
  if (folderId) {
    const targetFolder = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND isFolder = TRUE AND deletedAt IS NULL').get(folderId, userId);
    if (!targetFolder) { res.status(404).json({ error: 'Target folder not found' }); return; }
  }
  const updatedAt = new Date().toISOString();
  const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');
  await prepare(`UPDATE files SET folderId = $${ids.length + 1}, updatedAt = $${ids.length + 2} WHERE id IN (${placeholders}) AND userId = $${ids.length + 3} AND deletedAt IS NULL`).run(folderId || null, updatedAt, ...ids, userId);
  res.json({ message: `${ids.length} items moved successfully` });
});

async function deepCopyEntry(entryId: string, destFolderId: string | null, userId: string): Promise<void> {
  const entry = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(entryId, userId) as FileEntry | undefined;
  if (!entry) return;
  const newEntrySize = entry.isFolder ? 0 : entry.size;
  const q = await checkQuota(userId, newEntrySize);
  if (!q.allowed) return;
  const newId = uuidv4();
  const now = new Date().toISOString();
  if (entry.isFolder) {
    await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, entry.name, entry.name, 'application/folder', 0, '', destFolderId, userId, true, now, now);
    const children = await prepare('SELECT * FROM files WHERE folderId = $? AND userId = $? AND deletedAt IS NULL').all(entryId, userId) as FileEntry[];
    for (const child of children) await deepCopyEntry(child.id, newId, userId);
  } else {
    const ext = path.extname(entry.name);
    const safeName = `${newId}${ext}`;
    const userDir = path.join(UPLOAD_DIR_PATH, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    const newPath = path.join(userDir, safeName).replace(/\\/g, '/');
    if (fs.existsSync(entry.path)) fs.copyFileSync(entry.path, newPath);
    await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(newId, safeName, entry.originalName, entry.mimeType, entry.size, newPath, destFolderId, userId, false, now, now);
  }
}

router.post('/batch/copy', async (req: Request, res: Response) => {
  const { ids, folderId } = req.body;
  const userId = req.user!.userId;
  if (!ids || !Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'File IDs are required' }); return; }
  if (folderId) {
    const targetFolder = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND isFolder = TRUE AND deletedAt IS NULL').get(folderId, userId);
    if (!targetFolder) { res.status(404).json({ error: 'Target folder not found' }); return; }
  }
  for (const id of ids) await deepCopyEntry(id, folderId || null, userId);
  await recalculateUsedStorage(userId);
  res.json({ message: `${ids.length} items copied successfully` });
});

router.post('/:id/extract', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { destFolderId } = req.body;
  const userId = req.user!.userId;
  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $? AND deletedAt IS NULL').get(id, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }
  if (!file.mimeType.startsWith('application/zip') && !file.mimeType.startsWith('application/x-zip') && !file.name.endsWith('.zip')) { res.status(400).json({ error: 'Not a supported archive file' }); return; }
  if (!fs.existsSync(file.path)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  try {
    const zip = new AdmZip(file.path);
    const entries = zip.getEntries();
    const created: any[] = [];
    for (const entry of entries) {
      if (entry.isDirectory) {
        const folderId = uuidv4();
        const now = new Date().toISOString();
        const folderName = entry.entryName.replace(/\/$/, '').split('/').pop() || 'folder';
        await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(folderId, folderName, folderName, 'application/folder', 0, '', destFolderId || null, userId, true, now, now);
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
        const mimeType = ext === '.md' ? 'text/markdown' : ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.json' ? 'application/json' : ext === '.py' ? 'text/x-python' : ext === '.ts' || ext === '.tsx' ? 'text/typescript' : ext === '.txt' ? 'text/plain' : 'application/octet-stream';
        await prepare(`INSERT INTO files (id, name, originalName, mimeType, size, path, folderId, userId, isFolder, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, $?, $?, $?, $?, $?)`).run(fileId, safeName, originalName, mimeType, entry.header.size, filePath, destFolderId || null, userId, false, now, now);
        created.push({ id: fileId, name: originalName, isFolder: false });
      }
    }
    await recalculateUsedStorage(userId);
    res.json({ message: `Extracted ${entries.length} entries`, files: created });
  } catch (err: any) { res.status(500).json({ error: `Extraction failed: ${err.message}` }); }
});

export default router;
