import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import db from '../database';
import { authenticateToken } from '../middleware/auth';
import { FileEntry, ShareLink } from '../types';

const router = Router();

function generateToken(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

router.post('/', authenticateToken, (req: Request, res: Response) => {
  const { fileId, password, expiresInDays = 7 } = req.body;
  const userId = req.user!.userId;

  if (!fileId) {
    res.status(400).json({ error: 'fileId is required' });
    return;
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND userId = ?').get(fileId, userId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  if (file.isFolder) {
    res.status(400).json({ error: 'Folders cannot be shared' });
    return;
  }

  const id = uuidv4();
  const token = generateToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(expiresInDays) || 7));

  let passwordHash: string | null = null;
  if (password) {
    passwordHash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    INSERT INTO share_links (id, fileId, token, passwordHash, expiresAt, createdAt, downloads)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
  `).run(id, fileId, token, passwordHash, expiresAt.toISOString());

  const share = db.prepare('SELECT * FROM share_links WHERE id = ?').get(id);
  res.status(201).json(share);
});

router.get('/my', authenticateToken, (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const shares = db.prepare(`
    SELECT sl.*, f.name as fileName, f.originalName, f.mimeType, f.size
    FROM share_links sl
    JOIN files f ON sl.fileId = f.id
    WHERE f.userId = ?
    ORDER BY sl.createdAt DESC
  `).all(userId);

  res.json(shares);
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const share = db.prepare(`
    SELECT sl.* FROM share_links sl
    JOIN files f ON sl.fileId = f.id
    WHERE sl.id = ? AND f.userId = ?
  `).get(id, userId) as ShareLink | undefined;

  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  db.prepare('DELETE FROM share_links WHERE id = ?').run(id);
  res.json({ message: 'Share link deleted' });
});

router.get('/access/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.query;

  const share = db.prepare('SELECT * FROM share_links WHERE token = ?').get(token) as ShareLink | undefined;

  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  if (new Date(share.expiresAt) < new Date()) {
    res.status(410).json({ error: 'Share link has expired' });
    return;
  }

  if (share.passwordHash) {
    if (!password) {
      res.json({ protected: true, fileId: share.fileId });
      return;
    }

    if (!bcrypt.compareSync(password as string, share.passwordHash)) {
      res.status(403).json({ error: 'Invalid password' });
      return;
    }
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(share.fileId) as FileEntry | undefined;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  db.prepare('UPDATE share_links SET downloads = downloads + 1 WHERE id = ?').run(share.id);

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

router.get('/download/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const password = req.query.password as string | undefined;

  const share = db.prepare('SELECT * FROM share_links WHERE token = ?').get(token) as ShareLink | undefined;

  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  if (new Date(share.expiresAt) < new Date()) {
    res.status(410).json({ error: 'Share link has expired' });
    return;
  }

  if (share.passwordHash) {
    if (!password) {
      res.status(403).json({ error: 'Password required' });
      return;
    }
    if (!bcrypt.compareSync(password, share.passwordHash)) {
      res.status(403).json({ error: 'Invalid password' });
      return;
    }
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(share.fileId) as FileEntry | undefined;
  if (!file || !fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  db.prepare('UPDATE share_links SET downloads = downloads + 1 WHERE id = ?').run(share.id);

  res.download(file.path, file.originalName);
});

export default router;
