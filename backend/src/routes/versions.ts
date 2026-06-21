import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { prepare, recalculateUsedStorage, checkQuota, isFileTypeAllowed } from '../database';
import { authenticateToken } from '../middleware/auth';
import { upload, UPLOAD_DIR_PATH } from '../middleware/upload';
import { FileEntry, FileVersion } from '../types';

const router = Router();
router.use(authenticateToken);

router.get('/:fileId', async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const userId = req.user!.userId;

  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, userId) as FileEntry | undefined;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }

  const versions = await prepare(
    'SELECT * FROM file_versions WHERE fileId = $? ORDER BY versionNumber DESC'
  ).all(fileId) as FileVersion[];

  const enriched = await Promise.all(versions.map(async v => {
    const creator = await prepare('SELECT username, displayName FROM users WHERE id = $?').get(v.createdBy) as any;
    return { ...v, createdByName: creator ? (creator.displayName || creator.username) : 'Unknown' };
  }));

  res.json(enriched);
});

router.post('/:fileId/restore/:versionId', async (req: Request, res: Response) => {
  const { fileId, versionId } = req.params;
  const userId = req.user!.userId;

  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, userId) as FileEntry | undefined;
  if (!file || file.isFolder) { res.status(404).json({ error: 'File not found' }); return; }

  const version = await prepare('SELECT * FROM file_versions WHERE id = $? AND fileId = $?').get(versionId, fileId) as FileVersion | undefined;
  if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

  if (!fs.existsSync(version.storagePath)) {
    res.status(404).json({ error: 'Version file not found on disk' });
    return;
  }

  const currentVersions = await prepare(
    'SELECT MAX(versionNumber) as maxVer FROM file_versions WHERE fileId = $?'
  ).get(fileId) as any;
  const nextVer = (currentVersions?.maxVer || 0) + 1;

  const versionId_new = uuidv4();
  const userDir = path.join(UPLOAD_DIR_PATH, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const newPath = path.join(userDir, `${uuidv4()}${path.extname(file.name)}`).replace(/\\/g, '/');

  fs.copyFileSync(version.storagePath, newPath);

  const oldPath = file.path;
  if (fs.existsSync(oldPath)) {
    const oldVersionId = uuidv4();
    const oldSize = file.size;
    await prepare(`
      INSERT INTO file_versions (id, fileId, versionNumber, size, storagePath, createdBy, createdAt)
      VALUES ($?, $?, $?, $?, $?, $?, $?)
    `).run(oldVersionId, fileId, nextVer, oldSize, oldPath, userId, new Date().toISOString());

    const now = new Date().toISOString();
    await prepare('UPDATE files SET path = $?, size = $?, updatedAt = $? WHERE id = $?')
      .run(newPath, version.size, now, fileId);
    await recalculateUsedStorage(userId);
  }

  res.json({ message: 'Version restored', path: newPath, size: version.size });
});

router.post('/replace/:fileId', upload.single('file'), async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const userId = req.user!.userId;

  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    fs.unlinkSync(req.file.path);
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext && !(await isFileTypeAllowed(ext))) {
    fs.unlinkSync(req.file.path);
    res.status(403).json({ error: `Replacement with ${ext} files is disabled by administrator` });
    return;
  }

  const sizeDiff = req.file.size - file.size;
  if (sizeDiff > 0) {
    const q = await checkQuota(userId, sizeDiff);
    if (!q.allowed) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ error: `Storage quota exceeded. ${q.remaining} bytes remaining` });
      return;
    }
  }

  const currentVersions = await prepare(
    'SELECT MAX(versionNumber) as maxVer FROM file_versions WHERE fileId = $?'
  ).get(fileId) as any;
  const nextVer = (currentVersions?.maxVer || 0) + 1;

  if (fs.existsSync(file.path)) {
    const versionId = uuidv4();
    await prepare(`
      INSERT INTO file_versions (id, fileId, versionNumber, size, storagePath, createdBy, createdAt)
      VALUES ($?, $?, $?, $?, $?, $?, $?)
    `).run(versionId, fileId, nextVer, file.size, file.path, userId, new Date().toISOString());
  }

  const updatedAt = new Date().toISOString();
  await prepare('UPDATE files SET path = $?, size = $?, updatedAt = $? WHERE id = $?')
    .run(req.file.path.replace(/\\/g, '/'), req.file.size, updatedAt, fileId);

  await recalculateUsedStorage(userId);

  const updated = await prepare('SELECT * FROM files WHERE id = $?').get(fileId);
  res.json(updated);
});

export default router;
