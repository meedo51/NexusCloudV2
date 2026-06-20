import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import { prepare, logActivity } from '../database';
import { authenticateToken } from '../middleware/auth';
import { User, UserPublic, FileEntry, ActivityLogEntry } from '../types';

const ADMIN_IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean);
const ADMIN_REQUIRE_MFA = process.env.ADMIN_REQUIRE_MFA === 'true';

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  return ((+parts[0] << 24) + (+parts[1] << 16) + (+parts[2] << 8) + (+parts[3])) >>> 0;
}

function cidrToRange(cidr: string): { start: number; end: number } | null {
  const [ip, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (!ip || isNaN(bits)) return null;
  if (bits < 0 || bits > 32) return null;
  const ipLong = ipToLong(ip);
  const mask = ~(2 ** (32 - bits) - 1) >>> 0;
  const start = (ipLong & mask) >>> 0;
  const end = (start + 2 ** (32 - bits) - 1) >>> 0;
  return { start, end };
}

function ipInCidr(ip: string, cidr: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const range = cidrToRange(cidr);
  if (!range) return false;
  const ipLong = ipToLong(ip);
  return ipLong >= range.start && ipLong <= range.end;
}

const router = Router();
router.use(authenticateToken);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user!.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

function ipWhitelist(req: Request, res: Response, next: NextFunction): void {
  if (ADMIN_IP_WHITELIST.length === 0) return next();
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const ipv4 = clientIp.startsWith('::ffff:') ? clientIp.slice(7) : clientIp;
  const allowed = ADMIN_IP_WHITELIST.some(cidr => ipInCidr(ipv4, cidr));
  if (!allowed) {
    console.warn(`[ADMIN] Blocked access from non-whitelisted IP: ${ipv4}`);
    res.status(403).json({ error: 'Access from this IP is not allowed' });
    return;
  }
  next();
}

async function requireMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!ADMIN_REQUIRE_MFA) return next();
  try {
    const user = await prepare('SELECT two_factor_enabled FROM users WHERE id = $1').get(req.user!.userId) as any;
    if (!user?.two_factor_enabled) {
      res.status(403).json({
        error: 'Two-factor authentication must be enabled to access admin panel',
        require2FA: true,
      });
      return;
    }
    next();
  } catch {
    next();
  }
}

router.use(ipWhitelist);
router.use(requireAdmin);
router.use(requireMFA);

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName || '',
    storageQuotaBytes: u.storageQuotaBytes || 3221225472,
    usedStorageBytes: u.usedStorageBytes || 0,
    preferredView: u.preferredView || 'grid',
    two_factor_enabled: u.two_factor_enabled || false,
    isAdmin: u.isAdmin || false,
    createdAt: u.createdAt,
  };
}

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalUsers = await prepare('SELECT COUNT(*)::bigint as count FROM users').get() as any;
    const totalFiles = await prepare("SELECT COUNT(*)::bigint as count FROM files WHERE isFolder = FALSE").get() as any;
    const totalFolders = await prepare("SELECT COUNT(*)::bigint as count FROM files WHERE isFolder = TRUE").get() as any;
    const totalStorage = await prepare("SELECT COALESCE(SUM(size), 0)::bigint as total FROM files WHERE isFolder = FALSE").get() as any;
    const totalDocuments = await prepare('SELECT COUNT(*)::bigint as count FROM documents').get() as any;
    const activeUsers = await prepare("SELECT COUNT(DISTINCT userId)::bigint as count FROM activity_logs WHERE createdAt > NOW() - INTERVAL '24 hours'").get() as any;
    const recentRegistrations = await prepare("SELECT COUNT(*)::bigint as count FROM users WHERE createdAt > NOW() - INTERVAL '7 days'").get() as any;
    const storageByType = await prepare("SELECT mimeType, COUNT(*)::bigint as count, SUM(size)::bigint as totalSize FROM files WHERE isFolder = FALSE AND deletedAt IS NULL GROUP BY mimeType ORDER BY totalSize DESC LIMIT 10").all();
    const storageGrowth = await prepare("SELECT DATE(createdAt) as date, COALESCE(SUM(size), 0)::bigint as total FROM files WHERE isFolder = FALSE AND createdAt > NOW() - INTERVAL '30 days' GROUP BY DATE(createdAt) ORDER BY date").all();
    const topUsers = await prepare(`SELECT u.id, u.username, u.email, u.storageQuotaBytes, u.usedStorageBytes, COUNT(f.id)::bigint as fileCount FROM users u LEFT JOIN files f ON f.userId = u.id AND f.isFolder = FALSE AND f.deletedAt IS NULL GROUP BY u.id ORDER BY u.usedStorageBytes DESC LIMIT 10`).all();

    res.json({
      totalUsers: Number(totalUsers?.count || 0),
      totalFiles: Number(totalFiles?.count || 0),
      totalFolders: Number(totalFolders?.count || 0),
      totalStorage: Number(totalStorage?.total || 0),
      totalDocuments: Number(totalDocuments?.count || 0),
      activeUsers: Number(activeUsers?.count || 0),
      recentRegistrations: Number(recentRegistrations?.count || 0),
      storageByType,
      storageGrowth,
      topUsers,
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const {
      search,
      isAdmin,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['username', 'email', 'displayName', 'createdAt', 'storageQuotaBytes', 'usedStorageBytes', 'isAdmin'];
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereSql += ' AND (username ILIKE $? OR email ILIKE $?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (isAdmin === 'true') {
      whereSql += ' AND isAdmin = TRUE';
    } else if (isAdmin === 'false') {
      whereSql += ' AND isAdmin = FALSE';
    }

    const countResult = await prepare(`SELECT COUNT(*)::bigint as total FROM users ${whereSql}`).get(...params) as any;
    const total = Number(countResult?.total || 0);

    const users = await prepare(`SELECT * FROM users ${whereSql} ORDER BY ${sortField} ${order} LIMIT $? OFFSET $?`).all(...params, limitNum, offset) as User[];

    res.json({
      users: users.map(toPublic),
      total,
      page: pageNum,
    });
  } catch (err: any) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName, storageQuotaBytes, isAdmin } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    const existing = await prepare('SELECT id FROM users WHERE username = $1 OR email = $2').get(username, email);
    if (existing) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const quota = storageQuotaBytes != null ? parseInt(storageQuotaBytes, 10) : 3221225472;
    const admin = isAdmin === true;

    await prepare(
      'INSERT INTO users (id, username, email, passwordHash, displayName, storageQuotaBytes, isAdmin, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())'
    ).run(id, username, email, passwordHash, displayName || '', quota, admin);

    const user = await prepare('SELECT * FROM users WHERE id = $1').get(id) as User;
    await logActivity({
      userId: req.user!.userId,
      action: 'admin_create_user',
      itemType: 'user',
      itemId: id,
      itemName: username,
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.status(201).json(toPublic(user));
  } catch (err: any) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { username, email, password, displayName, storageQuotaBytes, isAdmin } = req.body;

    const existing = await prepare('SELECT * FROM users WHERE id = $1').get(id) as User | undefined;
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (username !== undefined && username !== existing.username) {
      const dup = await prepare('SELECT id FROM users WHERE username = $1 AND id != $2').get(username, id);
      if (dup) { res.status(409).json({ error: 'Username already taken' }); return; }
    }
    if (email !== undefined && email !== existing.email) {
      const dup = await prepare('SELECT id FROM users WHERE email = $1 AND id != $2').get(email, id);
      if (dup) { res.status(409).json({ error: 'Email already taken' }); return; }
    }

    const newUsername = username !== undefined ? username : existing.username;
    const newEmail = email !== undefined ? email : existing.email;
    const newDisplayName = displayName !== undefined ? displayName : existing.displayName;
    const newQuota = storageQuotaBytes != null ? parseInt(storageQuotaBytes, 10) : existing.storageQuotaBytes;
    const newAdmin = isAdmin !== undefined ? isAdmin : existing.isAdmin;

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      await prepare(
        'UPDATE users SET username = $1, email = $2, displayName = $3, storageQuotaBytes = $4, isAdmin = $5, passwordHash = $6 WHERE id = $7'
      ).run(newUsername, newEmail, newDisplayName, newQuota, newAdmin, passwordHash, id);
    } else {
      await prepare(
        'UPDATE users SET username = $1, email = $2, displayName = $3, storageQuotaBytes = $4, isAdmin = $5 WHERE id = $6'
      ).run(newUsername, newEmail, newDisplayName, newQuota, newAdmin, id);
    }

    const user = await prepare('SELECT * FROM users WHERE id = $1').get(id) as User;
    await logActivity({
      userId: req.user!.userId,
      action: 'admin_update_user',
      itemType: 'user',
      itemId: id,
      itemName: user.username,
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] ?? ''),
    });

    res.json(toPublic(user));
  } catch (err: any) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const user = await prepare('SELECT * FROM users WHERE id = $1').get(id) as User | undefined;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userFiles = await prepare('SELECT * FROM files WHERE userId = $1').all(id) as FileEntry[];
    for (const file of userFiles) {
      if (!file.isFolder && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    await prepare('DELETE FROM files WHERE userId = $1').run(id);
    await prepare('DELETE FROM documents WHERE ownerId = $1').run(id);
    await prepare('DELETE FROM activity_logs WHERE userId = $1').run(id);
    await prepare('DELETE FROM users WHERE id = $1').run(id);

    await logActivity({
      userId: req.user!.userId,
      action: 'admin_delete_user',
      itemType: 'user',
      itemId: id,
      itemName: user.username,
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.json({ message: `User ${user.username} deleted along with their files` });
  } catch (err: any) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/files', async (req: Request, res: Response) => {
  try {
    const {
      search,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
      userId,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['name', 'size', 'mimeType', 'createdAt', 'updatedAt', 'originalName'];
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereSql += ' AND name ILIKE $?';
      params.push(`%${search}%`);
    }
    if (type === 'file') {
      whereSql += ' AND isFolder = FALSE';
    } else if (type === 'folder') {
      whereSql += ' AND isFolder = TRUE';
    }
    if (userId) {
      whereSql += ' AND userId = $?';
      params.push(userId);
    }

    const countResult = await prepare(`SELECT COUNT(*)::bigint as total FROM files ${whereSql}`).get(...params) as any;
    const total = Number(countResult?.total || 0);

    const files = await prepare(`SELECT * FROM files ${whereSql} ORDER BY ${sortField} ${order} LIMIT $? OFFSET $?`)
      .all(...params, limitNum, offset) as FileEntry[];

    res.json({ files, total, page: pageNum });
  } catch (err: any) {
    console.error('Admin list files error:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

router.delete('/files/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const file = await prepare('SELECT * FROM files WHERE id = $1').get(id) as FileEntry | undefined;
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (!file.isFolder && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    await prepare('DELETE FROM files WHERE id = $1').run(id);

    await logActivity({
      userId: req.user!.userId,
      action: 'admin_force_delete_file',
      itemType: 'file',
      itemId: id,
      itemName: file.originalName || file.name,
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.json({ message: `File ${file.originalName || file.name} permanently deleted` });
  } catch (err: any) {
    console.error('Admin delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

router.put('/files/:id/transfer', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { userId: newUserId } = req.body;

    if (!newUserId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const file = await prepare('SELECT * FROM files WHERE id = $1').get(id) as FileEntry | undefined;
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const targetUser = await prepare('SELECT id FROM users WHERE id = $1').get(newUserId) as User | undefined;
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    const updatedAt = new Date().toISOString();
    await prepare('UPDATE files SET userId = $1, updatedAt = $2 WHERE id = $3').run(newUserId, updatedAt, id);

    const updated = await prepare('SELECT * FROM files WHERE id = $1').get(id);

    await logActivity({
      userId: req.user!.userId,
      action: 'admin_transfer_file',
      itemType: 'file',
      itemId: id,
      itemName: file.originalName || file.name,
      details: { fromUserId: file.userId, toUserId: newUserId },
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Admin transfer file error:', err);
    res.status(500).json({ error: 'Failed to transfer file' });
  }
});

router.get('/documents', async (req: Request, res: Response) => {
  try {
    const {
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'wordCount', 'version'];
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'updatedAt';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereSql += ' AND (name ILIKE $?)';
      params.push(`%${search}%`);
    }

    const countResult = await prepare(`SELECT COUNT(*)::bigint as total FROM documents ${whereSql}`).get(...params) as any;
    const total = Number(countResult?.total || 0);

    const documents = await prepare(`SELECT * FROM documents ${whereSql} ORDER BY ${sortField} ${order} LIMIT $? OFFSET $?`)
      .all(...params, limitNum, offset);

    res.json({ documents, total, page: pageNum });
  } catch (err: any) {
    console.error('Admin list documents error:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const doc = await prepare('SELECT * FROM documents WHERE id = $1').get(id) as any;
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prepare('DELETE FROM document_versions WHERE documentId = $1').run(id);
    await prepare('DELETE FROM document_comments WHERE documentId = $1').run(id);
    await prepare('DELETE FROM documents WHERE id = $1').run(id);

    await logActivity({
      userId: req.user!.userId,
      action: 'admin_delete_document',
      itemType: 'document',
      itemId: id,
      itemName: doc.name,
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.json({ message: `Document "${doc.name}" deleted` });
  } catch (err: any) {
    console.error('Admin delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
      ENABLE_2FA: process.env.ENABLE_2FA !== 'false',
      ENABLE_WEBDAV: process.env.ENABLE_WEBDAV === 'true',
      ENABLE_FULLTEXT_SEARCH: process.env.ENABLE_FULLTEXT_SEARCH === 'true',
      MAX_FILE_VERSIONS: parseInt(process.env.MAX_FILE_VERSIONS || '5', 10),
    };

    const system: any = await prepare('SELECT * FROM system_settings').all();
    const dbSettings: Record<string, string> = {};
    for (const row of system) {
      dbSettings[row.key] = row.value;
    }

    res.json({
      env: settings,
      db: dbSettings,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime()),
      },
    });
  } catch (err: any) {
    console.error('Admin settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'settings object is required' });
      return;
    }

    await prepare(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).run();

    for (const [key, value] of Object.entries(settings)) {
      await prepare(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updatedAt = NOW()
      `).run(key, String(value));
    }

    const all = await prepare('SELECT * FROM system_settings ORDER BY key').all();

    await logActivity({
      userId: req.user!.userId,
      action: 'admin_update_settings',
      itemType: 'settings',
      details: { keys: Object.keys(settings) },
      ipAddress: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.json({ message: 'Settings updated', settings: all });
  } catch (err: any) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const {
      action,
      userId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = ['createdAt', 'action', 'itemType', 'itemName', 'userId'];
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (action) {
      whereSql += ' AND action = $?';
      params.push(action);
    }
    if (userId) {
      whereSql += ' AND userId = $?';
      params.push(userId);
    }
    if (startDate) {
      whereSql += ' AND createdAt >= $?';
      params.push(startDate);
    }
    if (endDate) {
      whereSql += ' AND createdAt <= $?';
      params.push(endDate);
    }
    if (search) {
      whereSql += ' AND itemName ILIKE $?';
      params.push(`%${search}%`);
    }

    const countResult = await prepare(`SELECT COUNT(*)::bigint as total FROM activity_logs ${whereSql}`).get(...params) as any;
    const total = Number(countResult?.total || 0);

    const logs = await prepare(`SELECT * FROM activity_logs ${whereSql} ORDER BY ${sortField} ${order} LIMIT $? OFFSET $?`)
      .all(...params, limitNum, offset) as ActivityLogEntry[];

    const enriched = await Promise.all(logs.map(async (log) => {
      const user = await prepare('SELECT username, displayName FROM users WHERE id = $1').get(log.userId) as any;
      return {
        ...log,
        details: (() => { try { return JSON.parse(log.details); } catch { return log.details; } })(),
        userName: user ? (user.displayName || user.username) : 'Unknown',
      };
    }));

    res.json({ logs: enriched, total, page: pageNum });
  } catch (err: any) {
    console.error('Admin logs error:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  try {
    let dbConnected = false;
    try {
      await prepare('SELECT 1').get();
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    let diskStats: any = {};
    try {
      const uploadDir = path.resolve(UPLOAD_DIR);
      if (fs.existsSync(uploadDir)) {
        const stats = fs.statfsSync(uploadDir);
        diskStats = {
          free: stats.bfree * stats.bsize,
          total: stats.blocks * stats.bsize,
          used: (stats.blocks - stats.bfree) * stats.bsize,
          freeFormatted: `${(stats.bfree * stats.bsize / 1073741824).toFixed(2)} GB`,
          totalFormatted: `${(stats.blocks * stats.bsize / 1073741824).toFixed(2)} GB`,
        };
      } else {
        diskStats = { error: 'Upload directory does not exist' };
      }
    } catch (diskErr: any) {
      diskStats = { error: diskErr.message };
    }

    const mem = process.memoryUsage();

    res.json({
      status: dbConnected ? 'healthy' : 'degraded',
      database: { connected: dbConnected },
      disk: diskStats,
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        rssFormatted: `${(mem.rss / 1048576).toFixed(2)} MB`,
        heapUsedFormatted: `${(mem.heapUsed / 1048576).toFixed(2)} MB`,
      },
      uptime: Math.floor(process.uptime()),
      uptimeFormatted: `${Math.floor(process.uptime() / 86400)}d ${Math.floor((process.uptime() % 86400) / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      cpu: {
        loadAvg1m: os.loadavg()[0],
        loadAvg5m: os.loadavg()[1],
        loadAvg15m: os.loadavg()[2],
        cpus: os.cpus().length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Admin health error:', err);
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.post('/seed-admin', async (_req: Request, res: Response) => {
  try {
    const existing = await prepare("SELECT id FROM users WHERE username = 'admin'").get();
    if (existing) {
      res.json({ message: 'Admin user already exists', created: false });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync('admin123', 10);
    await prepare(
      'INSERT INTO users (id, username, email, passwordHash, displayName, storageQuotaBytes, isAdmin, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())'
    ).run(id, 'admin', 'admin@nexuscloud.app', passwordHash, 'Administrator', 10737418240, true);

    res.status(201).json({ message: 'Default admin user created', created: true });
  } catch (err: any) {
    console.error('Seed admin error:', err);
    res.status(500).json({ error: 'Failed to seed admin user' });
  }
});

export default router;
