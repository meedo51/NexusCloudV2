import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'nexuscloud.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    displayName TEXT NOT NULL DEFAULT '',
    storageQuotaBytes INTEGER NOT NULL DEFAULT 3221225472,
    usedStorageBytes INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL DEFAULT '',
    folderId TEXT,
    userId TEXT NOT NULL,
    isFolder INTEGER NOT NULL DEFAULT 0,
    deletedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (folderId) REFERENCES files(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS share_links (
    id TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    passwordHash TEXT,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    downloads INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, itemId)
  );

  CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
  CREATE INDEX IF NOT EXISTS idx_files_folderId ON files(folderId);
  CREATE INDEX IF NOT EXISTS idx_files_deletedAt ON files(deletedAt);
  CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
  CREATE INDEX IF NOT EXISTS idx_share_links_fileId ON share_links(fileId);
  CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
  CREATE INDEX IF NOT EXISTS idx_favorites_itemId ON favorites(itemId);
`);

try { db.prepare("ALTER TABLE users ADD COLUMN displayName TEXT NOT NULL DEFAULT ''").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN storageQuotaBytes INTEGER NOT NULL DEFAULT 3221225472").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN usedStorageBytes INTEGER NOT NULL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE files ADD COLUMN deletedAt TEXT").run(); } catch {}

export function recalculateUsedStorage(userId: string): number {
  const result = db.prepare(
    "SELECT COALESCE(SUM(size), 0) as total FROM files WHERE userId = ? AND isFolder = 0 AND deletedAt IS NULL"
  ).get(userId) as any;
  const total = result.total;
  db.prepare("UPDATE users SET usedStorageBytes = ? WHERE id = ?").run(total, userId);
  return total;
}

export function checkQuota(userId: string, additionalBytes: number): { allowed: boolean; used: number; quota: number; remaining: number } {
  const user = db.prepare("SELECT storageQuotaBytes, usedStorageBytes FROM users WHERE id = ?").get(userId) as any;
  const used = user?.usedStorageBytes || 0;
  const quota = user?.storageQuotaBytes || 3221225472;
  const remaining = quota - used;
  return {
    allowed: remaining >= additionalBytes,
    used,
    quota,
    remaining,
  };
}

export default db;
