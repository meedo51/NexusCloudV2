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
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parentId TEXT,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL,
    folderId TEXT,
    userId TEXT NOT NULL,
    isFolder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL,
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

  CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
  CREATE INDEX IF NOT EXISTS idx_files_folderId ON files(folderId);
  CREATE INDEX IF NOT EXISTS idx_folders_userId ON folders(userId);
  CREATE INDEX IF NOT EXISTS idx_folders_parentId ON folders(parentId);
  CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
  CREATE INDEX IF NOT EXISTS idx_share_links_fileId ON share_links(fileId);
`);

export default db;
