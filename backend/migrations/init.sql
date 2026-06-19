-- NexusCloud PostgreSQL Schema
-- Core + Tier 1 + Tier 2 + Tier 3

BEGIN;

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS (core + Tier 1 storage + Tier 3 2FA)
-- ============================================================
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
);

-- ============================================================
-- FILES (core + Tier 1 soft delete + isFolder flag)
-- ============================================================
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
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_files_folder FOREIGN KEY (folderId) REFERENCES files(id) ON DELETE SET NULL,
    CONSTRAINT fk_files_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- SHARE LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fileId UUID NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    passwordHash TEXT,
    expiresAt TIMESTAMPTZ NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    downloads INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_share_links_file FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================================
-- FAVORITES (Tier 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    itemId UUID NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_favorites_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, itemId)
);

-- ============================================================
-- FILE VERSIONS (Tier 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fileId UUID NOT NULL,
    versionNumber INTEGER NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    storagePath TEXT NOT NULL DEFAULT '',
    createdBy UUID NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_fv_file FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT fk_fv_user FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ACTIVITY LOGS (Tier 2)
-- ============================================================
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
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_al_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- UPLOAD REQUESTS (Tier 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    createdBy UUID NOT NULL,
    folderId UUID NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expiresAt TIMESTAMPTZ NOT NULL,
    maxSizeBytes BIGINT DEFAULT 52428800,
    allowedTypes JSONB DEFAULT '[]',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ur_creator FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_folder FOREIGN KEY (folderId) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================================
-- WORKSPACES (Tier 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    ownerId UUID NOT NULL,
    storageQuotaBytes BIGINT DEFAULT 10737418240,
    usedStorageBytes BIGINT DEFAULT 0,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ws_owner FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspaceId UUID NOT NULL,
    userId UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invitedBy UUID,
    joinedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspaceId, userId),
    CONSTRAINT fk_wm_workspace FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wm_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wm_invited_by FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workspace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceId UUID NOT NULL,
    itemId UUID NOT NULL,
    itemType VARCHAR(10) NOT NULL DEFAULT 'file' CHECK (itemType IN ('file', 'folder')),
    addedBy UUID NOT NULL,
    addedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_wi_workspace FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_user FOREIGN KEY (addedBy) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceId UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invitedBy UUID NOT NULL,
    expiresAt TIMESTAMPTZ NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_wi_ws FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_inviter FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- FILE CONTENTS for Full-Text Search (Tier 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS file_contents (
    fileId UUID PRIMARY KEY,
    contentText TEXT,
    searchVector TSVECTOR,
    extractedAt TIMESTAMPTZ,
    CONSTRAINT fk_fc_file FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fc_search_vector ON file_contents USING GIN(searchVector);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
CREATE INDEX IF NOT EXISTS idx_files_folderId ON files(folderId);
CREATE INDEX IF NOT EXISTS idx_files_deletedAt ON files(deletedAt);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_fileId ON share_links(fileId);
CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
CREATE INDEX IF NOT EXISTS idx_favorites_itemId ON favorites(itemId);
CREATE INDEX IF NOT EXISTS idx_file_versions_fileId ON file_versions(fileId);
CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs(userId);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_createdAt ON activity_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_upload_requests_token ON upload_requests(token);
CREATE INDEX IF NOT EXISTS idx_upload_requests_createdBy ON upload_requests(createdBy);
CREATE INDEX IF NOT EXISTS idx_workspaces_ownerId ON workspaces(ownerId);
CREATE INDEX IF NOT EXISTS idx_workspace_members_userId ON workspace_members(userId);
CREATE INDEX IF NOT EXISTS idx_workspace_items_workspaceId ON workspace_items(workspaceId);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);

COMMIT;
