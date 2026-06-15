import { Router, Request, Response } from 'express';
import { prepare, logActivity } from '../database';
import { authenticateToken } from '../middleware/auth';
import { ActivityLogEntry } from '../types';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  const { action, itemType, limit = '50', offset = '0', startDate, endDate } = req.query;
  const userId = req.user!.userId;
  const isAdmin = req.query.admin === 'true';

  let sql = 'SELECT * FROM activity_logs WHERE 1=1';
  const params: any[] = [];

  if (isAdmin) {
    await prepare('SELECT * FROM users WHERE id = $?').get(userId) as any;
  }

  if (!isAdmin) {
    sql += ' AND userId = $?';
    params.push(userId);
  }

  if (action) {
    sql += ' AND action = $?';
    params.push(action);
  }

  if (itemType) {
    sql += ' AND itemType = $?';
    params.push(itemType);
  }

  if (startDate) {
    sql += ' AND createdAt >= $?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND createdAt <= $?';
    params.push(endDate);
  }

  sql += ' ORDER BY createdAt DESC LIMIT $? OFFSET $?';
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const logs = await prepare(sql).all(...params) as ActivityLogEntry[];

  const enriched = await Promise.all(logs.map(async log => {
    const user = await prepare('SELECT username, displayName FROM users WHERE id = $?').get(log.userId) as any;
    return {
      ...log,
      details: (() => { try { return JSON.parse(log.details); } catch { return log.details; } })(),
      userName: user ? (user.displayName || user.username) : 'Unknown',
    };
  }));

  let countSql = 'SELECT COUNT(*)::bigint as total FROM activity_logs WHERE 1=1';
  const countParams: any[] = [];

  if (!isAdmin) {
    countSql += ' AND userId = $?';
    countParams.push(userId);
  }

  if (action) {
    countSql += ' AND action = $?';
    countParams.push(action);
  }

  if (itemType) {
    countSql += ' AND itemType = $?';
    countParams.push(itemType);
  }

  if (startDate) {
    countSql += ' AND createdAt >= $?';
    countParams.push(startDate);
  }

  if (endDate) {
    countSql += ' AND createdAt <= $?';
    countParams.push(endDate);
  }

  const countResult = await prepare(countSql).get(...countParams) as any;

  res.json({ logs: enriched, total: countResult?.total || 0 });
});

router.get('/export', async (req: Request, res: Response) => {
  const { action, startDate, endDate } = req.query;
  const userId = req.user!.userId;

  let sql = 'SELECT al.*, u.username, u.displayName FROM activity_logs al JOIN users u ON al.userId = u.id WHERE al.userId = $?';
  const params: any[] = [userId];

  if (action) { sql += ' AND al.action = $?'; params.push(action); }
  if (startDate) { sql += ' AND al.createdAt >= $?'; params.push(startDate); }
  if (endDate) { sql += ' AND al.createdAt <= $?'; params.push(endDate); }

  sql += ' ORDER BY al.createdAt DESC';

  const logs = await prepare(sql).all(...params) as any[];

  const header = 'Date,User,Action,Item Type,Item Name,Details,IP Address';
  const rows = logs.map(l => {
    const date = new Date(l.createdAt).toISOString();
    const user = l.displayName || l.username;
    const details = (() => { try { return JSON.stringify(JSON.parse(l.details)).replace(/,/g, ';'); } catch { return ''; } })();
    return `${date},${user},${l.action},${l.itemType},${l.itemName},"${details}",${l.ipAddress}`;
  });

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="activity-log.csv"');
  res.send(csv);
});

export default router;
