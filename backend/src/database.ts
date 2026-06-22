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
  isadmin: 'isAdmin',
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
  allowupload: 'allowUpload',
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
  iscustom: 'isCustom',
  pagecount: 'pageCount',
  wordcount: 'wordCount',
  documentid: 'documentId',
  rowcount: 'rowCount',
  colcount: 'colCount',
  currentpage: 'currentPage',
  lastreadat: 'lastReadAt',
  pagenumber: 'pageNumber',
  scrollposition: 'scrollPosition',
  readingmode: 'readingMode',
  sidebaropen: 'sidebarOpen',
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
        isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
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
            await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        ownerId UUID NOT NULL,
        folderId UUID,
        templateId TEXT,
        wordCount INTEGER NOT NULL DEFAULT 0,
        characterCount INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        isLocked BOOLEAN NOT NULL DEFAULT FALSE,
        lockedBy UUID,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        documentId UUID NOT NULL,
        content TEXT NOT NULL,
        versionNumber INTEGER NOT NULL,
        wordCount INTEGER NOT NULL DEFAULT 0,
        savedBy UUID NOT NULL,
        changeSummary TEXT DEFAULT '',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        documentId UUID NOT NULL,
        userId UUID NOT NULL,
        content TEXT NOT NULL,
        selectionStart INTEGER,
        selectionEnd INTEGER,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // PDF reader tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL UNIQUE,
        userId UUID NOT NULL,
        pageCount INTEGER NOT NULL DEFAULT 0,
        title TEXT DEFAULT '',
        author TEXT DEFAULT '',
        currentPage INTEGER NOT NULL DEFAULT 1,
        lastReadAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_highlights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        pageNumber INTEGER NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT 'yellow',
        text TEXT NOT NULL DEFAULT '',
        rects JSONB DEFAULT '[]',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        pageNumber INTEGER NOT NULL,
        label TEXT DEFAULT '',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        pageNumber INTEGER NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        x REAL DEFAULT 0,
        y REAL DEFAULT 0,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_drawings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        pageNumber INTEGER NOT NULL,
        strokes JSONB DEFAULT '[]',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        readingMode VARCHAR(10) NOT NULL DEFAULT 'light',
        zoom REAL NOT NULL DEFAULT 1.0,
        sidebarOpen BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(fileId, userId)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        pageNumber INTEGER NOT NULL DEFAULT 1,
        scrollPosition REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(fileId, userId)
      )
    `);

    // DocuPro tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS docupro_word_documents (
        id UUID PRIMARY KEY,
        userId UUID NOT NULL,
        name TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '',
        wordCount INTEGER NOT NULL DEFAULT 0,
        format VARCHAR(10) NOT NULL DEFAULT 'html',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS docupro_word_versions (
        id UUID PRIMARY KEY,
        documentId UUID NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        wordCount INTEGER NOT NULL DEFAULT 0,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS docupro_excel_spreadsheets (
        id UUID PRIMARY KEY,
        userId UUID NOT NULL,
        name TEXT NOT NULL DEFAULT 'Untitled',
        data JSONB DEFAULT '{}',
        rowCount INTEGER NOT NULL DEFAULT 50,
        colCount INTEGER NOT NULL DEFAULT 26,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS docupro_pdf_annotations (
        id UUID PRIMARY KEY,
        fileId UUID NOT NULL,
        userId UUID NOT NULL,
        annotations JSONB DEFAULT '[]',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // DocuPro indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_docupro_word_userId ON docupro_word_documents(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_docupro_word_versions_docId ON docupro_word_versions(documentId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_docupro_excel_userId ON docupro_excel_spreadsheets(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_docupro_pdf_ann_fileId ON docupro_pdf_annotations(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_docupro_pdf_ann_userId ON docupro_pdf_annotations(userId)');

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
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_metadata_fileId ON pdf_metadata(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_metadata_userId ON pdf_metadata(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_highlights_fileId ON pdf_highlights(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_highlights_userId ON pdf_highlights(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_bookmarks_fileId ON pdf_bookmarks(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_bookmarks_userId ON pdf_bookmarks(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_notes_fileId ON pdf_notes(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_notes_userId ON pdf_notes(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_drawings_fileId ON pdf_drawings(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_drawings_userId ON pdf_drawings(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_preferences_fileId ON pdf_preferences(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_preferences_userId ON pdf_preferences(userId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_progress_fileId ON pdf_progress(fileId)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_progress_userId ON pdf_progress(userId)');

    // File type configuration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_type_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        extension VARCHAR(20) NOT NULL UNIQUE,
        mimeType VARCHAR(255) NOT NULL DEFAULT '',
        name VARCHAR(255) NOT NULL DEFAULT '',
        category VARCHAR(50) NOT NULL DEFAULT 'other',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        isCustom BOOLEAN NOT NULL DEFAULT FALSE,
        icon VARCHAR(50) NOT NULL DEFAULT 'FiFile',
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default file types (only if table is empty)
    const existing = await client.query('SELECT COUNT(*)::bigint as count FROM file_type_config');
    if (Number(existing.rows[0]?.count || 0) === 0) {
      const defaults = [
        // Documents
        ['pdf', 'application/pdf', 'PDF Document', 'document', 'FiFileText'],
        ['doc', 'application/msword', 'Word Document', 'document', 'FiFileText'],
        ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word Document', 'document', 'FiFileText'],
        ['xls', 'application/vnd.ms-excel', 'Excel Spreadsheet', 'document', 'FiFileText'],
        ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel Spreadsheet', 'document', 'FiFileText'],
        ['ppt', 'application/vnd.ms-powerpoint', 'PowerPoint', 'document', 'FiFileText'],
        ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'PowerPoint', 'document', 'FiFileText'],
        ['txt', 'text/plain', 'Text File', 'document', 'FiFileText'],
        ['rtf', 'application/rtf', 'Rich Text', 'document', 'FiFileText'],
        ['odt', 'application/vnd.oasis.opendocument.text', 'OpenDocument', 'document', 'FiFileText'],
        ['csv', 'text/csv', 'CSV File', 'data', 'FiFileText'],
        // Images
        ['jpg', 'image/jpeg', 'JPEG Image', 'image', 'FiImage'],
        ['jpeg', 'image/jpeg', 'JPEG Image', 'image', 'FiImage'],
        ['png', 'image/png', 'PNG Image', 'image', 'FiImage'],
        ['gif', 'image/gif', 'GIF Image', 'image', 'FiImage'],
        ['bmp', 'image/bmp', 'Bitmap Image', 'image', 'FiImage'],
        ['svg', 'image/svg+xml', 'SVG Image', 'image', 'FiImage'],
        ['webp', 'image/webp', 'WebP Image', 'image', 'FiImage'],
        ['ico', 'image/x-icon', 'Icon', 'image', 'FiImage'],
        ['tiff', 'image/tiff', 'TIFF Image', 'image', 'FiImage'],
        ['tif', 'image/tiff', 'TIFF Image', 'image', 'FiImage'],
        // Code
        ['js', 'application/javascript', 'JavaScript', 'code', 'FiCode'],
        ['ts', 'application/typescript', 'TypeScript', 'code', 'FiCode'],
        ['jsx', 'text/jsx', 'JSX', 'code', 'FiCode'],
        ['tsx', 'text/tsx', 'TSX', 'code', 'FiCode'],
        ['py', 'text/x-python', 'Python', 'code', 'FiCode'],
        ['java', 'text/x-java', 'Java', 'code', 'FiCode'],
        ['cpp', 'text/x-c++src', 'C++', 'code', 'FiCode'],
        ['c', 'text/x-csrc', 'C', 'code', 'FiCode'],
        ['h', 'text/x-chdr', 'Header', 'code', 'FiCode'],
        ['rs', 'text/x-rust', 'Rust', 'code', 'FiCode'],
        ['go', 'text/x-go', 'Go', 'code', 'FiCode'],
        ['rb', 'text/x-ruby', 'Ruby', 'code', 'FiCode'],
        ['php', 'text/x-php', 'PHP', 'code', 'FiCode'],
        ['html', 'text/html', 'HTML', 'code', 'FiCode'],
        ['css', 'text/css', 'CSS', 'code', 'FiCode'],
        ['scss', 'text/x-scss', 'SCSS', 'code', 'FiCode'],
        ['json', 'application/json', 'JSON', 'data', 'FiCode'],
        ['xml', 'application/xml', 'XML', 'data', 'FiCode'],
        ['yaml', 'text/yaml', 'YAML', 'data', 'FiCode'],
        ['yml', 'text/yaml', 'YAML', 'data', 'FiCode'],
        ['toml', 'text/toml', 'TOML', 'data', 'FiCode'],
        ['sh', 'text/x-shellscript', 'Shell Script', 'code', 'FiCode'],
        ['bash', 'text/x-shellscript', 'Bash Script', 'code', 'FiCode'],
        ['sql', 'text/x-sql', 'SQL', 'code', 'FiCode'],
        // Video
        ['mp4', 'video/mp4', 'MP4 Video', 'video', 'FiVideo'],
        ['avi', 'video/x-msvideo', 'AVI Video', 'video', 'FiVideo'],
        ['mkv', 'video/x-matroska', 'MKV Video', 'video', 'FiVideo'],
        ['mov', 'video/quicktime', 'QuickTime', 'video', 'FiVideo'],
        ['wmv', 'video/x-ms-wmv', 'WMV Video', 'video', 'FiVideo'],
        ['flv', 'video/x-flv', 'FLV Video', 'video', 'FiVideo'],
        ['webm', 'video/webm', 'WebM Video', 'video', 'FiVideo'],
        // Audio
        ['mp3', 'audio/mpeg', 'MP3 Audio', 'audio', 'FiMusic'],
        ['wav', 'audio/wav', 'WAV Audio', 'audio', 'FiMusic'],
        ['ogg', 'audio/ogg', 'OGG Audio', 'audio', 'FiMusic'],
        ['flac', 'audio/flac', 'FLAC Audio', 'audio', 'FiMusic'],
        ['aac', 'audio/aac', 'AAC Audio', 'audio', 'FiMusic'],
        ['wma', 'audio/x-ms-wma', 'WMA Audio', 'audio', 'FiMusic'],
        ['m4a', 'audio/mp4', 'M4A Audio', 'audio', 'FiMusic'],
        // Archives
        ['zip', 'application/zip', 'ZIP Archive', 'archive', 'FiArchive'],
        ['rar', 'application/vnd.rar', 'RAR Archive', 'archive', 'FiArchive'],
        ['tar', 'application/x-tar', 'TAR Archive', 'archive', 'FiArchive'],
        ['gz', 'application/gzip', 'GZip Archive', 'archive', 'FiArchive'],
        ['7z', 'application/x-7z-compressed', '7-Zip Archive', 'archive', 'FiArchive'],
        ['bz2', 'application/x-bzip2', 'BZip2 Archive', 'archive', 'FiArchive'],
      ];
      for (const row of defaults) {
        await client.query(
          'INSERT INTO file_type_config (extension, mimeType, name, category, enabled, isCustom, icon) VALUES ($1, $2, $3, $4, TRUE, FALSE, $5) ON CONFLICT (extension) DO NOTHING',
          row
        );
      }
    }

    // Migrations for existing tables
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS isAdmin BOOLEAN NOT NULL DEFAULT FALSE');

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

export async function isFileTypeAllowed(extension: string): Promise<boolean> {
  if (!extension) return true;
  const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
  if (!ext) return true;
  const entry = await prepare('SELECT enabled FROM file_type_config WHERE extension = $1').get(ext) as { enabled: boolean } | undefined;
  return !entry || entry.enabled;
}

export { pool };
export default { prepare };

