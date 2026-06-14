export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  displayName: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
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
