import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prepare } from '../../database';

const router = Router();
router.use(authenticateToken);

router.post('/', async (req: Request, res: Response) => {
  const { key, value } = req.body;
  const userId = req.user!.userId;
  if (!key) return res.status(400).json({ error: 'key is required' });
  await prepare(
    `INSERT INTO docupro_storage (userId, key, value, updatedAt)
     VALUES ($?, $?, $?, NOW())
     ON CONFLICT (userId, key)
     DO UPDATE SET value = $?, updatedAt = NOW()`
  ).run(userId, key, JSON.stringify(value), JSON.stringify(value));
  res.json({ ok: true });
});

router.get('/:key', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const row = await prepare(
    'SELECT value FROM docupro_storage WHERE userId = $? AND key = $?'
  ).get(userId, req.params.key) as any;
  if (!row) return res.json({ value: null });
  res.json({ value: JSON.parse(row.value) });
});

router.delete('/:key', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await prepare(
    'DELETE FROM docupro_storage WHERE userId = $? AND key = $?'
  ).run(userId, req.params.key);
  res.json({ ok: true });
});

export default router;
