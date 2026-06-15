export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  preferredView: string;
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
  backup_codes: string;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  preferredView: string;
  two_factor_enabled: boolean;
  createdAt: string;
}

export interface FileEntry {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  folderId: string | null;
  userId: string;
  isFolder: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  size: number;
  storagePath: string;
  createdBy: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  itemType: string;
  itemId: string | null;
  itemName: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface UploadRequest {
  id: string;
  createdBy: string;
  folderId: string;
  token: string;
  expiresAt: string;
  maxSizeBytes: number;
  allowedTypes: string;
  createdAt: string;
}

export interface FavoriteEntry {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
  item?: FileEntry;
}

export interface FileQuery {
  folderId?: string;
  search?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  passwordHash: string | null;
  expiresAt: string;
  createdAt: string;
  downloads: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

// Tier 3 types
export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  role?: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string | null;
  joinedAt: string;
  username?: string;
  email?: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface WebDAVInfo {
  url: string;
  username: string;
  instructions: {
    windows: string;
    mac: string;
    linux: string;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  isFolder: boolean;
  snippet?: string;
  rank?: number;
}
