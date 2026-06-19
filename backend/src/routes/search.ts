import { Router, Request, Response } from 'express';
import { prepare } from '../database';
import { authenticateToken } from '../middleware/auth';
import { FileEntry } from '../types';

const router = Router();
const ENABLE_FTS = process.env.ENABLE_FULLTEXT_SEARCH !== 'false';

router.use(authenticateToken);

// Full-text search across file names + contents
router.get('/', async (req: Request, res: Response) => {
  const { q, type, page = '1', limit = '50' } = req.query;
  const userId = req.user!.userId;

  if (!q) { res.json({ results: [], total: 0 }); return; }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const searchQ = `%${q}%`;

  // Name search (always available)
  let nameSql = `
    SELECT f.*, 1 as rank FROM files f
    WHERE f.userId = $? AND f.deletedAt IS NULL AND (f.name ILIKE $? OR f.originalName ILIKE $?)
  `;
  const nameParams: any[] = [userId, searchQ, searchQ];
  if (type) { nameSql += ' AND f.mimeType LIKE $?'; nameParams.push(`${type}%`); }

  let ftsSql = '';
  let ftsParams: any[] = [];

  if (ENABLE_FTS) {
    // Full-text content search using tsvector
    ftsSql = `
      SELECT f.*, ts_rank(fc.searchVector, plainto_tsquery('english', $?)) as rank,
             ts_headline('english', fc.contentText, plainto_tsquery('english', $?), 'MaxWords=30, MinWords=15, ShortWord=3, HighlightAll=FALSE') as snippet
      FROM files f JOIN file_contents fc ON f.id = fc.fileId
      WHERE f.userId = $? AND f.deletedAt IS NULL
        AND fc.searchVector @@ plainto_tsquery('english', $?)
    `;
    ftsParams = [q, q, userId, q];
    if (type) { ftsSql += ' AND f.mimeType LIKE $?'; ftsParams.push(`${type}%`); }
  }

  // Combine name search and FTS
  let combinedSql = '';
  let allParams: any[] = [];

  if (ENABLE_FTS) {
    // FTS takes priority (rank > 1), name search is fallback (rank = 1)
    combinedSql = `
      SELECT ranked.* FROM (
        ${ftsSql} AND f.name NOT ILIKE $? AND f.originalName NOT ILIKE $?
        UNION ALL
        ${ftsSql} AND (f.name ILIKE $? OR f.originalName ILIKE $?)
        UNION ALL
        ${nameSql}
      ) ranked ORDER BY ranked.rank DESC, ranked.createdAt DESC
      LIMIT $? OFFSET $?
    `;
    if (type) {
      allParams = [q, q, userId, q, `${type}%`, q, q, q, userId, q, `${type}%`, ...nameParams, limitNum, offset];
    } else {
      const extraParams = [q, q, userId, q, q, q];
      const extraParams2 = [q, q, userId, q];
      allParams = [...extraParams, ...extraParams2, ...nameParams, limitNum, offset];
    }
  } else {
    combinedSql = `${nameSql} ORDER BY createdAt DESC LIMIT $? OFFSET $?`;
    // Need to rewrite nameParams to use numbered params correctly...
    // Since we're using $? auto-numbering, we can just append
    allParams = [...nameParams, limitNum, offset];
  }

  try {
    const results = await prepare(combinedSql).all(...allParams) as any[];

    // Get total count separately
    let countSql = `SELECT COUNT(*)::int as total FROM files WHERE userId = $? AND deletedAt IS NULL AND (name ILIKE $? OR originalName ILIKE $?)`;
    const countParams: any[] = [userId, searchQ, searchQ];
    if (type) { countSql += ' AND mimeType LIKE $?'; countParams.push(`${type}%`); }
    const countResult = await prepare(countSql).get(...countParams) as any;
    const total = countResult?.total || 0;

    const mapped = results.map(r => ({
      id: r.id,
      name: r.name,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: r.size,
      folderId: r.folderId,
      isFolder: r.isFolder,
      snippet: r.snippet || null,
      rank: r.rank || 1,
    }));

    res.json({ results: mapped, total });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', results: [], total: 0 });
  }
});

// Re-index endpoint for existing files
router.post('/reindex', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const files = await prepare(
    'SELECT f.id, f.path, f.mimeType, f.originalName FROM files f LEFT JOIN file_contents fc ON f.id = fc.fileId WHERE f.userId = $? AND f.deletedAt IS NULL AND f.isFolder = FALSE AND fc.fileId IS NULL'
  ).all(userId) as any[];

  const { extractText } = await import('../services/text-extractor');
  let indexed = 0;

  for (const file of files) {
    try {
      const extracted = await extractText(file.path, file.mimeType, file.originalName);
      if (extracted) {
        await prepare(
          'INSERT INTO file_contents (fileId, contentText, searchVector, extractedAt) VALUES ($?, $?, to_tsvector(\'english\', $?), NOW()) ON CONFLICT (fileId) DO UPDATE SET contentText = $?, searchVector = to_tsvector(\'english\', $?), extractedAt = NOW()'
        ).run(file.id, extracted, extracted, extracted, extracted);
        indexed++;
      }
    } catch {}
  }

  res.json({ message: `Re-indexed ${indexed} files` });
});

export default router;
