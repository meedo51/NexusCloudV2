import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nexuscloud',
  user: process.env.DB_USER || 'nexuscloud',
  password: process.env.DB_PASSWORD || 'nexuscloud_dev_pass',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: any) => {
  console.error('PostgreSQL pool error:', err);
});

function convertParams(sql: string): string {
  let idx = 0;
  return sql.replace(/\$?\?/g, () => `$${++idx}`);
}

const COLUMN_ALIASES: Record<string, string> = {
  passwordhash: 'passwordHash',
  displayname: 'displayName',
  storagequotabytes: 'storageQuotaBytes',
  usedstoragebytes: 'usedStorageBytes',
  preferredview: 'preferredView',
  mimetype: 'mimeType',
  folderid: 'folderId',
  userid: 'userId',
  isfolder: 'isFolder',
  deletedat: 'deletedAt',
  createdat: 'createdAt',
  updatedat: 'updatedAt',
  fileid: 'fileId',
  filename: 'fileName',
  versionnumber: 'versionNumber',
  storagepath: 'storagePath',
  createdby: 'createdBy',
  itemtype: 'itemType',
  itemid: 'itemId',
  itemname: 'itemName',
  originalname: 'originalName',
  ipaddress: 'ipAddress',
  useragent: 'userAgent',
  maxsizebytes: 'maxSizeBytes',
  allowedtypes: 'allowedTypes',
  expiresat: 'expiresAt',
  ownerid: 'ownerId',
  membercount: 'memberCount',
  workspaceid: 'workspaceId',
  invitedby: 'invitedBy',
  joinedat: 'joinedAt',
  searchvector: 'searchVector',
  extractedat: 'extractedAt',
  contenttext: 'contentText',
  backupcodes: 'backupCodes',
  twofactorsecret: 'twoFactorSecret',
  twofactorenabled: 'twoFactorEnabled',
  foldername: 'folderName',
  parentid: 'parentId',
  storageschemaversion: 'storageSchemaVersion',
};

function toCamelCase(rows: any[]): any[] {
  return rows.map(row => {
    const result: any = {};
    for (const key of Object.keys(row)) {
      result[COLUMN_ALIASES[key] || key] = row[key];
    }
    return result;
  });
}

export function prepare(sql: string) {
  const pgSql = convertParams(sql);
  return {
    run: (...params: any[]) => pool.query(pgSql, params),
    get: async (...params: any[]) => {
      const result = await pool.query(pgSql, params);
      const rows = toCamelCase(result.rows);
      return rows[0] || undefined;
    },
    all: async (...params: any[]) => {
      const result = await pool.query(pgSql, params);
      return toCamelCase(result.rows);
    },
  };
}

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        displayName VARCHAR(255) NOT NULL DEFAULT '',
        storageQuotaBytes BIGINT NOT NULL DEFAULT 3221225472,
        usedStorageBytes BIGINT NOT NULL DEFAULT 0,
        preferredView VARCHAR(10) NOT NULL DEFAULT 'grid',
        two_factor_secret TEXT,
        two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        backup_codes JSONB DEFAULT '[]',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        originalName TEXT NOT NULL,
        mimeType TEXT NOT NULL DEFAULT 'application/octet-stream',
        size BIGINT NOT NULL DEFAULT 0,
        path TEXT NOT NULL DEFAULT '',
        folderId UUID,
        userId UUID NOT NULL,
        isFolder BOOLEAN NOT NULL DEFAULT FALSE,
        deletedAt TIMESTAMPTZ,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS share_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        token VARCHAR(64) UNIQUE NOT NULL,
        passwordHash TEXT,
        expiresAt TIMESTAMPTZ NOT NULL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        downloads INTEGER NOT NULL DEFAULT 0,
        isFolder BOOLEAN NOT NULL DEFAULT FALSE,
        permission VARCHAR(20) NOT NULL DEFAULT 'download',
        allowUpload BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await client.query(`ALTER TABLE share_links ADD COLUMN IF NOT EXISTS isFolder BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE share_links ADD COLUMN IF NOT EXISTS permission VARCHAR(20) NOT NULL DEFAULT 'download'`);
    await client.query(`ALTER TABLE share_links ADD COLUMN IF NOT EXISTS allowUpload BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        userId UUID NOT NULL,
        itemId UUID NOT NULL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(userId, itemId)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        versionNumber INTEGER NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        storagePath TEXT NOT NULL DEFAULT '',
        createdBy UUID NOT NULL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        userId UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        itemType VARCHAR(20) NOT NULL DEFAULT 'file',
        itemId UUID,
        itemName TEXT NOT NULL DEFAULT '',
        details JSONB DEFAULT '{}',
        ipAddress VARCHAR(45) DEFAULT '',
        userAgent TEXT DEFAULT '',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS upload_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        createdBy UUID NOT NULL,
        folderId UUID NOT NULL,
        token VARCHAR(64) UNIQUE NOT NULL,
        expiresAt TIMESTAMPTZ NOT NULL,
        maxSizeBytes BIGINT DEFAULT 52428800,
        allowedTypes JSONB DEFAULT '[]',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        ownerId UUID NOT NULL,
        storageQuotaBytes BIGINT DEFAULT 10737418240,
        usedStorageBytes BIGINT DEFAULT 0,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspaceId UUID NOT NULL,
        userId UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        invitedBy UUID,
        joinedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspaceId, userId)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspaceId UUID NOT NULL,
        itemId UUID NOT NULL,
        itemType VARCHAR(10) NOT NULL DEFAULT 'file',
        addedBy UUID NOT NULL,
        addedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspaceId UUID NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(64) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        invitedBy UUID NOT NULL,
        expiresAt TIMESTAMPTZ NOT NULL,
        accepted BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_contents (
        fileId UUID PRIMARY KEY,
        contentText TEXT,
        searchVector TSVECTOR,
        extractedAt TIMESTAMPTZ
      )
    `);
    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_folderId ON files(folderId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_deletedAt ON files(deletedAt)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_share_links_fileId ON share_links(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_favorites_itemId ON favorites(itemId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_file_versions_fileId ON file_versions(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_createdAt ON activity_logs(createdAt)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_upload_requests_token ON upload_requests(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_upload_requests_createdBy ON upload_requests(createdBy)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workspaces_ownerId ON workspaces(ownerId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workspace_members_userId ON workspace_members(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workspace_items_workspaceId ON workspace_items(workspaceId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fc_search_vector ON file_contents USING GIN(searchVector)');
    await client.query('COMMIT');
    console.log('Database schema initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function recalculateUsedStorage(userId: string): Promise<number> {
  const result = await prepare(
    "SELECT COALESCE(SUM(size), 0)::BIGINT as total FROM files WHERE userId = $1 AND isFolder = FALSE AND deletedAt IS NULL"
  ).get(userId) as any;
  const total = result ? result.total : 0;
  await prepare("UPDATE users SET usedStorageBytes = $1 WHERE id = $2").run(total, userId);
  return total;
}

export async function checkQuota(userId: string, additionalBytes: number): Promise<{ allowed: boolean; used: number; quota: number; remaining: number }> {
  const user = await prepare("SELECT storageQuotaBytes, usedStorageBytes FROM users WHERE id = $1").get(userId) as any;
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

export async function logActivity(params: {
  userId: string;
  action: string;
  itemType?: string;
  itemId?: string;
  itemName?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prepare(`
      INSERT INTO activity_logs (userId, action, itemType, itemId, itemName, details, ipAddress, userAgent, createdAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `).run(
      params.userId, params.action, params.itemType || 'file',
      params.itemId || null, params.itemName || '',
      JSON.stringify(params.details || {}),
      params.ipAddress || '', params.userAgent || ''
    );
  } catch {}
}

const MAX_VERSIONS = parseInt(process.env.MAX_FILE_VERSIONS || '5', 10);
export async function pruneVersions(fileId: string): Promise<void> {
  const versions = await prepare(
    'SELECT id FROM file_versions WHERE fileId = $1 ORDER BY versionNumber DESC'
  ).all(fileId) as any[];
  if (versions.length > MAX_VERSIONS) {
    const toDelete = versions.slice(MAX_VERSIONS);
    for (const v of toDelete) {
      const ver = await prepare('SELECT * FROM file_versions WHERE id = $1').get(v.id) as any;
      if (ver && ver.storagePath && fs.existsSync(ver.storagePath)) {
        fs.unlinkSync(ver.storagePath);
      }
      await prepare('DELETE FROM file_versions WHERE id = $1').run(v.id);
    }
  }
}

export { pool };
export default { prepare };
