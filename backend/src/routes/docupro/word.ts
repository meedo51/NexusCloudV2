import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prepare } from '../../database';

const router = Router();

router.use(authenticateToken);

router.get('/documents', async (req: Request, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const rows = await prepare(
    'SELECT id, userId, name, content, wordCount, format, createdAt, updatedAt FROM docupro_word_documents WHERE userId = $? ORDER BY updatedAt DESC LIMIT $? OFFSET $?'
  ).all((req as any).user.id, parseInt(limit as string), offset);
  const total = await prepare('SELECT COUNT(*) as count FROM docupro_word_documents WHERE userId = $?').get((req as any).user.id) as any;
  res.json({ documents: rows, total: total?.count || 0 });
});

router.post('/documents', async (req: Request, res: Response) => {
  const { name, content = '', format = 'html' } = req.body;
  const id = require('uuid').v4();
  await prepare(
    'INSERT INTO docupro_word_documents (id, userId, name, content, format, wordCount, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, NOW(), NOW())'
  ).run(id, (req as any).user.id, name || 'Untitled', content, format, 0);
  const doc = await prepare('SELECT * FROM docupro_word_documents WHERE id = $?').get(id);
  res.status(201).json(doc);
});

router.get('/documents/:id', async (req: Request, res: Response) => {
  const doc = await prepare('SELECT * FROM docupro_word_documents WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

router.put('/documents/:id', async (req: Request, res: Response) => {
  const { content, name, wordCount } = req.body;
  const existing = await prepare('SELECT * FROM docupro_word_documents WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  const wc = wordCount ?? (content ? content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0);
  await prepare(
    'UPDATE docupro_word_documents SET content = $?, name = COALESCE($?, name), wordCount = $?, updatedAt = NOW() WHERE id = $?'
  ).run(content ?? (existing as any).content, name ?? null, wc, req.params.id);
  await prepare(
    'INSERT INTO docupro_word_versions (id, documentId, content, wordCount, createdAt) VALUES ($?, $?, $?, $?, NOW())'
  ).run(require('uuid').v4(), req.params.id, content ?? (existing as any).content, wc);
  const doc = await prepare('SELECT * FROM docupro_word_documents WHERE id = $?').get(req.params.id);
  res.json(doc);
});

router.delete('/documents/:id', async (req: Request, res: Response) => {
  const existing = await prepare('SELECT * FROM docupro_word_documents WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });
  await prepare('DELETE FROM docupro_word_versions WHERE documentId = $?').run(req.params.id);
  await prepare('DELETE FROM docupro_word_documents WHERE id = $?').run(req.params.id);
  res.json({ message: 'Document deleted' });
});

router.get('/documents/:id/versions', async (req: Request, res: Response) => {
  const versions = await prepare(
    'SELECT id, documentId, wordCount, createdAt FROM docupro_word_versions WHERE documentId = $? ORDER BY createdAt DESC LIMIT 50'
  ).all(req.params.id);
  res.json(versions);
});

export default router;
