import axios, { AxiosProgressEvent } from 'axios';
import { AuthResponse, FileItem, ShareLink, ShareAccessResponse, FileContent } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then(r => r.data),
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: { username?: string; email?: string; displayName?: string }) =>
    api.put('/auth/profile', data).then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }).then(r => r.data),
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
  batchDelete: (ids: string[]) =>
    api.post('/files/batch/delete', { ids }).then(r => r.data),
  batchMove: (ids: string[], folderId: string | null) =>
    api.post('/files/batch/move', { ids, folderId }).then(r => r.data),
};

const publicApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

publicApi.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const shareApi = {
  create: (fileId: string, password?: string, expiresInDays?: number) =>
    api.post<ShareLink>('/share', { fileId, password, expiresInDays }).then(r => r.data),
  list: () =>
    api.get<ShareLink[]>('/share/my').then(r => r.data),
  delete: (id: string) =>
    api.delete(`/share/${id}`).then(r => r.data),
  access: (token: string, password?: string) =>
    publicApi.get<ShareAccessResponse>(`/share/access/${token}`, { params: { password } }).then(r => r.data),
  download: (token: string, password?: string) =>
    publicApi.get(`/share/download/${token}`, {
      params: { password },
      responseType: 'blob',
    }).then(r => r.data),
};

export default api;
