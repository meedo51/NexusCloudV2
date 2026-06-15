import axios, { AxiosProgressEvent } from 'axios';
import {
  AuthResponse, FileItem, ShareLink, ShareAccessResponse, FileContent,
  QuotaInfo, FavoriteEntry, BreadcrumbItem, FileVersion, ActivityLogEntry,
  UploadRequest, Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceItem,
  TwoFactorSetup, WebDAVInfo, SearchResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (username: string, password: string, totpCode?: string, backupCode?: string) =>
    api.post<AuthResponse>('/auth/login', { username, password, totpCode, backupCode }).then(r => r.data),
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: { username?: string; email?: string; displayName?: string }) =>
    api.put('/auth/profile', data).then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }).then(r => r.data),
  setup2FA: () => api.post<TwoFactorSetup>('/auth/2fa/setup').then(r => r.data),
  verify2FA: (token: string) => api.post('/auth/2fa/verify', { token }).then(r => r.data),
  disable2FA: (password: string) => api.post('/auth/2fa/disable', { password }).then(r => r.data),
  getBackupCodes: () => api.get<{ backupCodes: string[] }>('/auth/2fa/backup-codes').then(r => r.data),
  regenerateBackupCodes: (password: string) => api.post<{ backupCodes: string[] }>('/auth/2fa/regenerate-backup-codes', { password }).then(r => r.data),
  preferredView: (view: string) => api.put('/auth/preferred-view', { view }).then(r => r.data),
};

export const filesApi = {
  list: (params?: { folderId?: string; search?: string; type?: string; sortBy?: string; sortOrder?: string }) =>
    api.get<FileItem[]>('/files', { params }).then(r => r.data),
  upload: (file: File, folderId?: string, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    return api.post<FileItem>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data);
  },
  createFolder: (name: string, parentId?: string) =>
    api.post<FileItem>('/files/folder', { name, parentId }).then(r => r.data),
  createFile: (name: string, content: string, folderId?: string) =>
    api.post<FileItem>('/files/create', { name, content, folderId }).then(r => r.data),
  rename: (id: string, name: string) =>
    api.put<FileItem>(`/files/${id}/rename`, { name }).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/files/${id}`).then(r => r.data),
  move: (id: string, folderId: string | null) =>
    api.put<FileItem>(`/files/${id}/move`, { folderId }).then(r => r.data),
  download: (id: string) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }).then(r => r.data),
  downloadZip: (id: string) =>
    api.get(`/files/${id}/download-zip`, { responseType: 'blob' }).then(r => r.data),
  preview: (id: string) =>
    api.get(`/files/${id}/preview`).then(r => r.data),
  details: (id: string) =>
    api.get(`/files/${id}/details`).then(r => r.data),
  allFolders: () =>
    api.get('/files/all-folders').then(r => r.data),
  getContent: (id: string) =>
    api.get<FileContent>(`/files/${id}/content`).then(r => r.data),
  saveContent: (id: string, content: string) =>
    api.put(`/files/${id}/content`, { content }).then(r => r.data),
  extract: (id: string, destFolderId?: string) =>
    api.post(`/files/${id}/extract`, { destFolderId }).then(r => r.data),
  batchZip: (ids: string[], zipName?: string) =>
    api.post('/files/batch/zip', { ids, zipName }, { responseType: 'blob' }).then(r => r.data),
  batchSaveZip: (ids: string[], zipName: string, folderId?: string) =>
    api.post('/files/batch/save-zip', { ids, zipName, folderId }).then(r => r.data),
  batchDelete: (ids: string[]) =>
    api.post('/files/batch/delete', { ids }).then(r => r.data),
  batchMove: (ids: string[], folderId: string | null) =>
    api.post('/files/batch/move', { ids, folderId }).then(r => r.data),
  batchCopy: (ids: string[], folderId: string | null) =>
    api.post('/files/batch/copy', { ids, folderId }).then(r => r.data),
  trash: (params?: { sortBy?: string; sortOrder?: string }) =>
    api.get<FileItem[]>('/files/trash', { params }).then(r => r.data),
  restore: (id: string) =>
    api.post(`/files/${id}/restore`).then(r => r.data),
  batchRestore: () =>
    api.post<{ message: string }>('/files/trash/restore-all').then(r => r.data),
  deletePermanent: (id: string) =>
    api.delete(`/files/${id}/permanent`).then(r => r.data),
  purgeTrash: () =>
    api.post('/files/trash/purge').then(r => r.data),
  purgeOldTrash: () =>
    api.post('/files/trash/purge-old').then(r => r.data),
  search: (q: string, type?: string) =>
    api.get<FileItem[]>('/files/search', { params: { q, type } }).then(r => r.data),
  breadcrumb: (folderId?: string) =>
    api.get<BreadcrumbItem[]>('/files/breadcrumb', { params: { folderId } }).then(r => r.data),
  favorites: () =>
    api.get<FavoriteEntry[]>('/files/favorites').then(r => r.data),
  toggleFavorite: (id: string) =>
    api.post<{ favorited: boolean }>(`/files/${id}/favorite`).then(r => r.data),
  getQuota: () =>
    api.get<QuotaInfo>('/files/quota').then(r => r.data),
  uploadFolder: (folderId: string, formData: FormData, onProgress?: (pct: number) => void) =>
    api.post(`/files/upload-folder?folderId=${folderId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data),
};

export const versionsApi = {
  list: (fileId: string) => api.get<FileVersion[]>(`/versions/${fileId}`).then(r => r.data),
  replace: (fileId: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/versions/replace/${fileId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(r => r.data);
  },
  restore: (fileId: string, versionId: string) =>
    api.post(`/versions/${fileId}/restore/${versionId}`).then(r => r.data),
};

export const activitiesApi = {
  list: (params?: { action?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get<{ logs: ActivityLogEntry[]; total: number }>('/activities', { params }).then(r => r.data),
  exportCSV: () => api.get('/activities/export', { responseType: 'blob' }).then(r => r.data),
};

export const uploadRequestsApi = {
  create: (data: { folderId: string; expiresInHours?: number; maxSizeBytes?: number; allowedTypes?: string[] }) =>
    api.post<UploadRequest>('/upload-requests', data).then(r => r.data),
  list: () =>
    api.get<UploadRequest[]>('/upload-requests').then(r => r.data),
  delete: (id: string) => api.delete(`/upload-requests/${id}`).then(r => r.data),
  access: (token: string) =>
    api.get(`/upload-requests/access/${token}`).then(r => r.data),
  upload: (token: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/upload-requests/upload/${token}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const workspacesApi = {
  list: () => api.get<Workspace[]>('/workspaces').then(r => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Workspace>('/workspaces', data).then(r => r.data),
  get: (id: string) => api.get<Workspace>(`/workspaces/${id}`).then(r => r.data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put<Workspace>(`/workspaces/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/workspaces/${id}`).then(r => r.data),
  invite: (id: string, email: string, role?: string) =>
    api.post<{ message: string; token: string; email: string }>(`/workspaces/${id}/invite`, { email, role }).then(r => r.data),
  acceptInvite: (token: string) =>
    api.post(`/workspaces/invite/${token}/accept`).then(r => r.data),
  invites: (id: string) => api.get<WorkspaceInvite[]>(`/workspaces/${id}/invites`).then(r => r.data),
  listItems: (id: string) => api.get<WorkspaceItem[]>(`/workspaces/${id}/items`).then(r => r.data),
  addItem: (id: string, itemId: string, itemType?: string) =>
    api.post(`/workspaces/${id}/items`, { itemId, itemType }).then(r => r.data),
  removeItem: (id: string, itemId: string) =>
    api.delete(`/workspaces/${id}/items/${itemId}`).then(r => r.data),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/workspaces/${id}/members/${memberId}`).then(r => r.data),
  updateMemberRole: (id: string, memberId: string, role: string) =>
    api.put(`/workspaces/${id}/members/${memberId}/role`, { role }).then(r => r.data),
  leave: (id: string) => api.post(`/workspaces/${id}/leave`).then(r => r.data),
};

const plainApi = axios.create({ baseURL: '' });
export const webdavApi = {
  info: () => plainApi.get<WebDAVInfo>('/webdav/info').then(r => r.data),
};

export const searchApi = {
  search: (q: string, type?: string, page?: number, limit?: number) =>
    api.get<SearchResponse>('/search', { params: { q, type, page, limit } }).then(r => r.data),
  reindex: () => api.post('/search/reindex').then(r => r.data),
};

const publicApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
publicApi.interceptors.response.use((res) => res, (err) => Promise.reject(err));

export const shareApi = {
  create: (fileId: string, password?: string, expiresInDays?: number, permission?: string, allowUpload?: boolean) =>
    api.post<ShareLink>('/share', { fileId, password, expiresInDays, permission, allowUpload }).then(r => r.data),
  list: () => api.get<ShareLink[]>('/share/my').then(r => r.data),
  delete: (id: string) => api.delete(`/share/${id}`).then(r => r.data),
  access: (token: string, password?: string) =>
    publicApi.get<ShareAccessResponse>(`/share/access/${token}`, { params: { password } }).then(r => r.data),
  accessFolder: (token: string, password?: string, folderId?: string) =>
    publicApi.get<{ permission: string; allowUpload: boolean; files: any[] }>(`/share/access/${token}/files`, { params: { password, folderId } }).then(r => r.data),
  download: (token: string, password?: string) =>
    publicApi.get(`/share/download/${token}`, { params: { password }, responseType: 'blob' }).then(r => r.data),
  downloadFile: (token: string, fileId: string, password?: string) =>
    publicApi.get(`/share/download/${token}/file/${fileId}`, { params: { password }, responseType: 'blob' }).then(r => r.data),
  upload: (token: string, file: File, password?: string) => {
    const form = new FormData();
    form.append('file', file);
    return publicApi.post(`/share/upload/${token}`, form, {
      params: { password },
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export default api;
