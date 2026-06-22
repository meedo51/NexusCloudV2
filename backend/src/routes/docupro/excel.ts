import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prepare } from '../../database';

const router = Router();

router.use(authenticateToken);

router.get('/spreadsheets', async (req: Request, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const rows = await prepare(
    'SELECT id, userId, name, rowCount, colCount, createdAt, updatedAt FROM docupro_excel_spreadsheets WHERE userId = $? ORDER BY updatedAt DESC LIMIT $? OFFSET $?'
  ).all((req as any).user.userId, parseInt(limit as string), offset);
  const total = await prepare('SELECT COUNT(*) as count FROM docupro_excel_spreadsheets WHERE userId = $?').get((req as any).user.userId) as any;
  res.json({ spreadsheets: rows, total: total?.count || 0 });
});

router.post('/spreadsheets', async (req: Request, res: Response) => {
  const { name, data, rowCount = 50, colCount = 26 } = req.body;
  const id = require('uuid').v4();
  await prepare(
    'INSERT INTO docupro_excel_spreadsheets (id, userId, name, data, rowCount, colCount, createdAt, updatedAt) VALUES ($?, $?, $?, $?, $?, $?, NOW(), NOW())'
  ).run(id, (req as any).user.userId, name || 'Untitled', JSON.stringify(data || {}), rowCount, colCount);
  const sheet = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $?').get(id);
  res.status(201).json(sheet);
});

router.get('/spreadsheets/:id', async (req: Request, res: Response) => {
  const sheet = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.userId);
  if (!sheet) return res.status(404).json({ error: 'Spreadsheet not found' });
  if ((sheet as any).data) (sheet as any).data = JSON.parse((sheet as any).data);
  res.json(sheet);
});

router.put('/spreadsheets/:id', async (req: Request, res: Response) => {
  const { name, data, rowCount, colCount } = req.body;
  const existing = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.userId);
  if (!existing) return res.status(404).json({ error: 'Spreadsheet not found' });
  await prepare(
    'UPDATE docupro_excel_spreadsheets SET name = COALESCE($?, name), data = COALESCE($?, data), rowCount = COALESCE($?, rowCount), colCount = COALESCE($?, colCount), updatedAt = NOW() WHERE id = $?'
  ).run(name ?? null, data ? JSON.stringify(data) : null, rowCount ?? null, colCount ?? null, req.params.id);
  const sheet = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $?').get(req.params.id);
  if ((sheet as any).data) (sheet as any).data = JSON.parse((sheet as any).data);
  res.json(sheet);
});

router.delete('/spreadsheets/:id', async (req: Request, res: Response) => {
  const existing = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.userId);
  if (!existing) return res.status(404).json({ error: 'Spreadsheet not found' });
  await prepare('DELETE FROM docupro_excel_spreadsheets WHERE id = $?').run(req.params.id);
  res.json({ message: 'Spreadsheet deleted' });
});

router.post('/spreadsheets/:id/sync', async (req: Request, res: Response) => {
  const { data, rowCount, colCount } = req.body;
  const existing = await prepare('SELECT * FROM docupro_excel_spreadsheets WHERE id = $? AND userId = $?').get(req.params.id, (req as any).user.userId);
  if (!existing) return res.status(404).json({ error: 'Spreadsheet not found' });
  await prepare(
    'UPDATE docupro_excel_spreadsheets SET data = $?, rowCount = COALESCE($?, rowCount), colCount = COALESCE($?, colCount), updatedAt = NOW() WHERE id = $?'
  ).run(JSON.stringify(data), rowCount ?? null, colCount ?? null, req.params.id);
  res.json({ message: 'Synced' });
});

export default router;
