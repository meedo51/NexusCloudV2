import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { prepare, initializeDatabase } from './database';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import shareRoutes from './routes/share';
import versionRoutes from './routes/versions';
import activityRoutes from './routes/activities';
import uploadRequestRoutes from './routes/upload-requests';
import thumbnailRoutes from './routes/thumbnails';
import workspaceRoutes from './routes/workspaces';
import webdavRoutes from './routes/webdav';
import searchRoutes from './routes/search';
import documentRoutes from './routes/documents';
import { jobQueue } from './services/queue';
import { extractText, shouldExtract } from './services/text-extractor';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const shareLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: 'Too many requests, please try again later' } });

const ENABLE_WEBDAV = process.env.ENABLE_WEBDAV !== 'false';
const ENABLE_FULLTEXT_SEARCH = process.env.ENABLE_FULLTEXT_SEARCH !== 'false';

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/upload-requests', uploadRequestRoutes);
app.use('/api/thumbnail', thumbnailRoutes);
app.use('/api/share', shareLimiter, shareRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/search', searchRoutes);
if (ENABLE_WEBDAV) app.use('/webdav', webdavRoutes);

// Background job: text extraction on file upload
if (ENABLE_FULLTEXT_SEARCH) {
  jobQueue.register('extract-text', async (job: any) => {
    const { fileId, filePath, mimeType, fileName } = job.data;
    const { prepare } = await import('./database');
    const text = await extractText(filePath, mimeType, fileName);
    if (text) {
      await prepare(
        'INSERT INTO file_contents (fileId, contentText, searchVector, extractedAt) VALUES ($?, $?, to_tsvector(\'english\', $?), NOW()) ON CONFLICT (fileId) DO UPDATE SET contentText = $?, searchVector = to_tsvector(\'english\', $?), extractedAt = NOW()'
      ).run(fileId, text, text, text, text);
    }
  });
  console.log('Full-text search enabled');
}

// Schedule: auto-purge old trash (daily)
const PURGE_INTERVAL_MS = parseInt(process.env.PURGE_INTERVAL_MS || '86400000', 10);
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldFiles = await prepare(
      'SELECT * FROM files WHERE deletedAt IS NOT NULL AND deletedAt < $?'
    ).all(cutoff) as any[];
    for (const file of oldFiles) {
      if (!file.isFolder && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (file.isFolder) {
        const descendants = await prepare("SELECT * FROM files WHERE folderId = $?").all(file.id) as any[];
        for (const d of descendants) { if (!d.isFolder && d.path && fs.existsSync(d.path)) fs.unlinkSync(d.path); }
        await prepare("DELETE FROM files WHERE folderId = $?").run(file.id);
      }
      await prepare('DELETE FROM files WHERE id = $?').run(file.id);
    }
    if (oldFiles.length > 0) {
      for (const file of oldFiles) {
        await prepare('UPDATE users SET usedStorageBytes = (SELECT COALESCE(SUM(size), 0)::BIGINT FROM files WHERE userId = $? AND isFolder = FALSE AND deletedAt IS NULL) WHERE id = $?').run(file.userId, file.userId);
      }
      console.log(`Auto-purged ${oldFiles.length} expired trash items`);
    }
  } catch (err) { console.error('Purge error:', err); }
}, PURGE_INTERVAL_MS);

// Schedule: version pruning (hourly)
const VERSION_PURGE_INTERVAL_MS = parseInt(process.env.VERSION_PURGE_INTERVAL_MS || '3600000', 10);
setInterval(async () => {
  try {
    const MAX_VERSIONS = parseInt(process.env.MAX_FILE_VERSIONS || '5', 10);
    const allFileIds = await prepare('SELECT DISTINCT fileId FROM file_versions').all() as any[];
    for (const row of allFileIds) {
      const versions = await prepare('SELECT id, storagePath FROM file_versions WHERE fileId = $? ORDER BY versionNumber DESC').all(row.fileId) as any[];
      if (versions.length > MAX_VERSIONS) {
        const toDelete = versions.slice(MAX_VERSIONS);
        for (const v of toDelete) {
          if (v.storagePath && fs.existsSync(v.storagePath)) fs.unlinkSync(v.storagePath);
          await prepare('DELETE FROM file_versions WHERE id = $?').run(v.id);
        }
      }
    }
  } catch (err) { console.error('Version purge error:', err); }
}, VERSION_PURGE_INTERVAL_MS);

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await initializeDatabase();
    console.log('Database connected and initialized');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`NexusCloud API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  start();
}

export default app;


