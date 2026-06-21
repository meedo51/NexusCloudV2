export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  preferredView?: string;
  two_factor_enabled?: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorage: number;
  totalDocuments: number;
  activeUsers24h: number;
  recentRegistrations: number;
  storageByType: { mimeType: string; count: number; totalSize: number }[];
  storageGrowth: { date: string; total: number }[];
  topUsers: { id: string; username: string; email: string; storageQuotaBytes: number; usedStorageBytes: number; fileCount: number }[];
}

export interface AdminUserListResponse {
  users: UserPublic[];
  total: number;
  page: number;
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
  isAdmin: boolean;
  createdAt: string;
}

export interface AdminFileListResponse {
  files: FileItem[];
  total: number;
  page: number;
}

export interface AdminDocumentListResponse {
  documents: any[];
  total: number;
  page: number;
}

export interface AdminSettings {
  CORS_ORIGIN: string;
  MAX_FILE_SIZE: string;
  ENABLE_2FA: string;
  ENABLE_WEBDAV: string;
  ENABLE_FULLTEXT_SEARCH: string;
  MAX_FILE_VERSIONS: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
}

export interface AdminLogListResponse {
  logs: ActivityLogEntry[];
  total: number;
  page: number;
}

export interface SystemHealth {
  database: { connected: boolean; latencyMs: number };
  disk: { total: number; free: number; usedPercent: number };
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  cpu: { loadAvg: number[] };
  uptime: number;
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
  isFolder: boolean;
  permission: 'view' | 'download' | 'upload';
  allowUpload: boolean;
}

export interface SharedFolderFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  isFolder: boolean;
  folderId: string | null;
}

export interface ShareAccessResponse {
  protected?: boolean;
  file?: { id: string; name: string; mimeType: string; size: number; };
  downloadUrl?: string;
  expiresAt?: string;
  isFolder?: boolean;
  folder?: { id: string; name: string; };
  permission?: 'view' | 'download' | 'upload';
  allowUpload?: boolean;
  files?: SharedFolderFile[];
}

export interface AuthResponse {
  token: string;
  user: User;
  require2FA?: boolean;
  tempToken?: string;
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

export interface NexusDocument {
  id: string;
  name: string;
  content: string;
  ownerId: string;
  folderId: string | null;
  templateId: string | null;
  wordCount: number;
  characterCount: number;
  version: number;
  isLocked: boolean;
  lockedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  versionNumber: number;
  wordCount: number;
  savedBy: string;
  changeSummary: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  resolved: boolean;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
}

export interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  lineCount: number;
  encoding: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileTypeConfig {
  id: string;
  extension: string;
  mimeType: string;
  name: string;
  category: string;
  enabled: boolean;
  isCustom: boolean;
  icon: string;
  createdAt: string;
}


