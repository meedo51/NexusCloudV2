import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prepare } from '../database';
import { authenticateToken } from '../middleware/auth';
import { FileEntry } from '../types';

const router = Router();
router.use(authenticateToken);

const THUMB_DIR = process.env.THUMBNAIL_DIR || path.join(process.cwd(), 'data', 'thumbnails');
if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

router.get('/:fileId', async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const size = (req.query.size as string) || 'small';
  const userId = req.user!.userId;

  const file = await prepare('SELECT * FROM files WHERE id = $? AND userId = $?').get(fileId, userId) as FileEntry | undefined;
  if (!file || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const thumbSuffix = size === 'small' ? '200' : '800';
  const thumbPath = path.join(THUMB_DIR, `${fileId}_${thumbSuffix}.webp`);

  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(thumbPath);
    return;
  }

  if (file.mimeType.startsWith('image/') && fs.existsSync(file.path)) {
    const sharpPath = path.join(__dirname, '..', '..', 'node_modules', 'sharp', 'build', 'Release', 'sharp.node');
    try {
      const sharp = require('sharp');
      const width = size === 'small' ? 200 : 800;
      sharp(file.path)
        .resize(width, width, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbPath)
        .then(() => {
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.sendFile(thumbPath);
        })
        .catch(() => res.status(500).json({ error: 'Thumbnail generation failed' }));
      return;
    } catch {}
  }

  res.status(404).json({ error: 'No thumbnail available' });
});

export default router;
