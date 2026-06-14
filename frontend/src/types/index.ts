export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
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
}

export interface ShareAccessResponse {
  protected?: boolean;
  file?: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
  };
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
