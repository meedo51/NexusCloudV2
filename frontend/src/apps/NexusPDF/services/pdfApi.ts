import api from '../../../services/api';

export interface HighlightData {
  id: string;
  pageNumber: number;
  color: string;
  text: string;
  rects: { x: number; y: number; width: number; height: number }[];
}

export interface NoteData {
  id: string;
  pageNumber: number;
  content: string;
  x: number;
  y: number;
  createdAt: string;
}

export interface BookmarkData {
  id: string;
  pageNumber: number;
  label: string;
  createdAt: string;
}

export interface PDFPreferences {
  readingMode: 'light' | 'dark' | 'sepia';
  zoom: number;
  sidebarOpen: boolean;
}

async function getFileUrl(fileId: string): Promise<string> {
  const resp = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
  return URL.createObjectURL(resp.data as Blob);
}

async function getMetadata(fileId: string) {
  return api.get(`/pdf/metadata/${fileId}`).then(r => r.data);
}

async function getProgress(fileId: string) {
  return api.get(`/pdf/progress/${fileId}`).then(r => r.data);
}

async function updateProgress(fileId: string, data: { pageNumber?: number; percentage?: number }) {
  return api.patch(`/pdf/progress/${fileId}`, data).then(r => r.data);
}

async function getHighlights(fileId: string, page?: number) {
  const qs = page ? `?page=${page}` : '';
  return api.get(`/pdf/highlights/${fileId}${qs}`).then(r => r.data as HighlightData[]);
}

async function addHighlight(fileId: string, data: { pageNumber: number; color?: string; text?: string; rects?: any[] }) {
  return api.post(`/pdf/highlights/${fileId}`, data).then(r => r.data as HighlightData);
}

async function deleteHighlight(id: string) {
  return api.delete(`/pdf/highlights/${id}`).then(r => r.data);
}

async function getNotes(fileId: string, page?: number) {
  const qs = page ? `?page=${page}` : '';
  return api.get(`/pdf/notes/${fileId}${qs}`).then(r => r.data as NoteData[]);
}

async function addNote(fileId: string, data: { pageNumber: number; content: string; x?: number; y?: number }) {
  return api.post(`/pdf/notes/${fileId}`, data).then(r => r.data as NoteData);
}

async function deleteNote(id: string) {
  return api.delete(`/pdf/notes/${id}`).then(r => r.data);
}

async function getBookmarks(fileId: string) {
  return api.get(`/pdf/bookmarks/${fileId}`).then(r => r.data as BookmarkData[]);
}

async function addBookmark(fileId: string, data: { pageNumber: number; label?: string }) {
  return api.post(`/pdf/bookmarks/${fileId}`, data).then(r => r.data as BookmarkData);
}

async function deleteBookmark(id: string) {
  return api.delete(`/pdf/bookmarks/${id}`).then(r => r.data);
}

async function getPreferences(fileId: string) {
  return api.get(`/pdf/preferences/${fileId}`).then(r => r.data as PDFPreferences);
}

async function updatePreferences(fileId: string, data: Partial<PDFPreferences>) {
  return api.patch(`/pdf/preferences/${fileId}`, data).then(r => r.data as PDFPreferences);
}

export const pdfApi = {
  getFileUrl,
  getMetadata,
  getProgress,
  updateProgress,
  getHighlights,
  addHighlight,
  deleteHighlight,
  getNotes,
  addNote,
  deleteNote,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  getPreferences,
  updatePreferences,
};
