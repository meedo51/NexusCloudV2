import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prepare } from '../../database';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const rows = await prepare(
    'SELECT id, name, data->>\'type\' as type, data->>\'app\' as app, size, "createdAt", "updatedAt" FROM docupro_files WHERE userId = $? ORDER BY "updatedAt" DESC'
  ).all(userId) as any[];
  res.json(rows);
});

router.post('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, app, type, content } = req.body;
  if (!name || !app) return res.status(400).json({ error: 'name and app required' });
  const result = await prepare(
    `INSERT INTO docupro_files (userId, name, app, data, size, "createdAt", "updatedAt")
     VALUES ($?, $?, $?, $?, $?, NOW(), NOW())
     RETURNING id, name, app, data, size, "createdAt", "updatedAt"`
  ).run(userId, name, app, JSON.stringify({ type, content }), JSON.stringify(content).length);
  res.json(result.rows?.[0] || result);
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const row = await prepare(
    'SELECT id, name, app, data, size, "createdAt", "updatedAt" FROM docupro_files WHERE id = $? AND userId = $?'
  ).get(req.params.id, userId) as any;
  if (!row) return res.status(404).json({ error: 'File not found' });
  row.data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  res.json(row);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await prepare(
    'DELETE FROM docupro_files WHERE id = $? AND userId = $?'
  ).run(req.params.id, userId);
  res.json({ ok: true });
});

export default router;
