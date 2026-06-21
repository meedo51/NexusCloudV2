import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prepare } from '../database';

const router = Router();
router.use(authenticateToken);

// GET /api/pdf/metadata/:fileId - Get PDF metadata + page count
router.get('/metadata/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  let meta = await prepare(
    'SELECT * FROM pdf_metadata WHERE fileId = $1 AND userId = $2'
  ).get(fileId, userId);
  if (!meta) {
    meta = await prepare(
      `INSERT INTO pdf_metadata (fileId, userId) VALUES ($1, $2) RETURNING *`
    ).get(fileId, userId);
  }
  res.json(meta);
});

// PATCH /api/pdf/progress/:fileId - Update reading progress
router.patch('/progress/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { pageNumber, scrollPosition, percentage } = req.body as {
    pageNumber?: number; scrollPosition?: number; percentage?: number;
  };
  await prepare(
    `INSERT INTO pdf_progress (fileId, userId, pageNumber, scrollPosition, percentage, updatedAt)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (fileId, userId)
     DO UPDATE SET pageNumber = COALESCE($3, pdf_progress.pageNumber),
                   scrollPosition = COALESCE($4, pdf_progress.scrollPosition),
                   percentage = COALESCE($5, pdf_progress.percentage),
                   updatedAt = NOW()`
  ).run(fileId, userId, pageNumber ?? null, scrollPosition ?? null, percentage ?? null);
  await prepare(
    'UPDATE pdf_metadata SET currentPage = $1, lastReadAt = NOW(), updatedAt = NOW() WHERE fileId = $2 AND userId = $3'
  ).run(pageNumber ?? 1, fileId, userId);
  res.json({ success: true });
});

// GET /api/pdf/progress/:fileId - Get reading progress
router.get('/progress/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const progress = await prepare(
    'SELECT * FROM pdf_progress WHERE fileId = $1 AND userId = $2'
  ).get(fileId, userId);
  res.json(progress || { pageNumber: 1, scrollPosition: 0, percentage: 0 });
});

// GET /api/pdf/last-reads - Get recently read PDFs
router.get('/last-reads', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const limit = parseInt(req.query.limit as string || '10', 10);
  const reads = await prepare(
    `SELECT pm.*, f.name as fileName, f.originalName as originalName
     FROM pdf_metadata pm
     JOIN files f ON f.id = pm.fileId
     WHERE pm.userId = $1
     ORDER BY pm.lastReadAt DESC
     LIMIT $2`
  ).all(userId, limit);
  res.json(reads);
});

// GET /api/pdf/highlights/:fileId - Get all highlights for a PDF
router.get('/highlights/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  let sql = 'SELECT * FROM pdf_highlights WHERE fileId = $1 AND userId = $2';
  const params: any[] = [fileId, userId];
  if (page) { sql += ' AND pageNumber = $3'; params.push(page); }
  sql += ' ORDER BY createdAt DESC';
  const highlights = await prepare(sql).all(...params);
  res.json(highlights);
});

// POST /api/pdf/highlights/:fileId - Add a highlight
router.post('/highlights/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { pageNumber, color, text, rects } = req.body as {
    pageNumber: number; color?: string; text?: string; rects?: any[];
  };
  const hl = await prepare(
    `INSERT INTO pdf_highlights (fileId, userId, pageNumber, color, text, rects)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
  ).get(fileId, userId, pageNumber, color || 'yellow', text || '', JSON.stringify(rects || []));
  res.status(201).json(hl);
});

// DELETE /api/pdf/highlights/:id - Delete a highlight
router.delete('/highlights/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { id } = req.params;
  await prepare('DELETE FROM pdf_highlights WHERE id = $1 AND userId = $2').run(id, userId);
  res.json({ success: true });
});

// GET /api/pdf/bookmarks/:fileId - Get all bookmarks
router.get('/bookmarks/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const bookmarks = await prepare(
    'SELECT * FROM pdf_bookmarks WHERE fileId = $1 AND userId = $2 ORDER BY pageNumber ASC'
  ).all(fileId, userId);
  res.json(bookmarks);
});

// POST /api/pdf/bookmarks/:fileId - Add a bookmark
router.post('/bookmarks/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { pageNumber, label } = req.body as { pageNumber: number; label?: string };
  const bm = await prepare(
    `INSERT INTO pdf_bookmarks (fileId, userId, pageNumber, label)
     VALUES ($1, $2, $3, $4) RETURNING *`
  ).get(fileId, userId, pageNumber, label || '');
  res.status(201).json(bm);
});

// DELETE /api/pdf/bookmarks/:id - Delete a bookmark
router.delete('/bookmarks/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { id } = req.params;
  await prepare('DELETE FROM pdf_bookmarks WHERE id = $1 AND userId = $2').run(id, userId);
  res.json({ success: true });
});

// GET /api/pdf/notes/:fileId - Get all notes
router.get('/notes/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  let sql = 'SELECT * FROM pdf_notes WHERE fileId = $1 AND userId = $2';
  const params: any[] = [fileId, userId];
  if (page) { sql += ' AND pageNumber = $3'; params.push(page); }
  sql += ' ORDER BY createdAt DESC';
  const notes = await prepare(sql).all(...params);
  res.json(notes);
});

// POST /api/pdf/notes/:fileId - Add a note
router.post('/notes/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { pageNumber, content, x, y } = req.body as {
    pageNumber: number; content?: string; x?: number; y?: number;
  };
  const note = await prepare(
    `INSERT INTO pdf_notes (fileId, userId, pageNumber, content, x, y)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
  ).get(fileId, userId, pageNumber, content || '', x ?? 0, y ?? 0);
  res.status(201).json(note);
});

// DELETE /api/pdf/notes/:id - Delete a note
router.delete('/notes/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { id } = req.params;
  await prepare('DELETE FROM pdf_notes WHERE id = $1 AND userId = $2').run(id, userId);
  res.json({ success: true });
});

// GET /api/pdf/drawings/:fileId - Get all drawings
router.get('/drawings/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  let sql = 'SELECT * FROM pdf_drawings WHERE fileId = $1 AND userId = $2';
  const params: any[] = [fileId, userId];
  if (page) { sql += ' AND pageNumber = $3'; params.push(page); }
  sql += ' ORDER BY createdAt ASC';
  const drawings = await prepare(sql).all(...params);
  res.json(drawings);
});

// POST /api/pdf/drawings/:fileId - Save drawing strokes
router.post('/drawings/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { pageNumber, strokes } = req.body as { pageNumber: number; strokes: any[] };
  const drawing = await prepare(
    `INSERT INTO pdf_drawings (fileId, userId, pageNumber, strokes)
     VALUES ($1, $2, $3, $4) RETURNING *`
  ).get(fileId, userId, pageNumber, JSON.stringify(strokes || []));
  res.status(201).json(drawing);
});

// DELETE /api/pdf/drawings/:id - Delete a drawing
router.delete('/drawings/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { id } = req.params;
  await prepare('DELETE FROM pdf_drawings WHERE id = $1 AND userId = $2').run(id, userId);
  res.json({ success: true });
});

// GET /api/pdf/preferences/:fileId - Get reading preferences
router.get('/preferences/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  let prefs = await prepare(
    'SELECT * FROM pdf_preferences WHERE fileId = $1 AND userId = $2'
  ).get(fileId, userId);
  if (!prefs) {
    prefs = await prepare(
      `INSERT INTO pdf_preferences (fileId, userId) VALUES ($1, $2) RETURNING *`
    ).get(fileId, userId);
  }
  res.json(prefs);
});

// PATCH /api/pdf/preferences/:fileId - Update reading preferences
router.patch('/preferences/:fileId', async (req: Request, res: Response) => {
  const userId = req.user!.userId as string;
  const { fileId } = req.params;
  const { readingMode, zoom, sidebarOpen } = req.body as {
    readingMode?: string; zoom?: number; sidebarOpen?: boolean;
  };
  const prefs = await prepare(
    `INSERT INTO pdf_preferences (fileId, userId, readingMode, zoom, sidebarOpen, updatedAt)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (fileId, userId)
     DO UPDATE SET readingMode = COALESCE($3, pdf_preferences.readingMode),
                   zoom = COALESCE($4, pdf_preferences.zoom),
                   sidebarOpen = COALESCE($5, pdf_preferences.sidebarOpen),
                   updatedAt = NOW()
     RETURNING *`
  ).get(fileId, userId, readingMode || 'light', zoom ?? 1.0, sidebarOpen ?? true);
  res.json(prefs);
});

export default router;
