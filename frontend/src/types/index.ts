export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface FileContent {
  content: string;
  mimeType: string;
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
