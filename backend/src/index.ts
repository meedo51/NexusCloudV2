import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import shareRoutes from './routes/share';
import db from './database';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareLimiter, shareRoutes);

const PURGE_INTERVAL_MS = parseInt(process.env.PURGE_INTERVAL_MS || '86400000', 10);
setInterval(() => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldFiles = db.prepare(
      'SELECT * FROM files WHERE deletedAt IS NOT NULL AND deletedAt < ?'
    ).all(cutoff) as any[];
    for (const file of oldFiles) {
      if (!file.isFolder && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (file.isFolder) {
        const descendants = db.prepare("SELECT * FROM files WHERE folderId = ?").all(file.id) as any[];
        for (const d of descendants) {
          if (!d.isFolder && d.path && fs.existsSync(d.path)) fs.unlinkSync(d.path);
        }
        db.prepare("DELETE FROM files WHERE folderId = ?").run(file.id);
      }
      db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    }
    if (oldFiles.length > 0) {
      for (const file of oldFiles) {
        db.prepare('UPDATE users SET usedStorageBytes = (SELECT COALESCE(SUM(size), 0) FROM files WHERE userId = ? AND isFolder = 0 AND deletedAt IS NULL) WHERE id = ?').run(file.userId, file.userId);
      }
      console.log(`Auto-purged ${oldFiles.length} expired trash items`);
    }
  } catch (err) {
    console.error('Purge error:', err);
  }
}, PURGE_INTERVAL_MS);

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NexusCloud API running on port ${PORT}`);
});

export default app;
