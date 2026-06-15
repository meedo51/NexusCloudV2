export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  preferredView?: string;
  two_factor_enabled?: boolean;
  createdAt: string;
}

export interface FileItem {
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
  parentPath?: { id: string; name: string }[];
  itemCount?: number;
}

export interface FileContent {
  content: string;
  mimeType: string;
  name: string;
}

export interface FavoriteEntry {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
  item: FileItem | null;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  passwordHash: string | null;
  expiresAt: string;
  createdAt: string;
  downloads: number;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  require2FA?: boolean;
  tempToken?: string;
}

export interface ShareAccessResponse {
  protected?: boolean;
  file?: { id: string; name: string; mimeType: string; size: number; };
  downloadUrl?: string;
  expiresAt?: string;
}

export interface FolderTreeItem {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeItem[];
}

export interface QuotaInfo {
  used: number;
  quota: number;
  remaining: number;
  percent: number;
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
  members?: WorkspaceMember[];
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

export interface WorkspaceItem {
  id: string;
  workspaceId: string;
  itemId: string;
  itemType: string;
  addedBy: string;
  addedAt: string;
  name?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  isFolder?: boolean;
  folderId?: string | null;
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

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}
