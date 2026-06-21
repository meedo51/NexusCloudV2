import api from '../../../services/api';

export interface PDFMetadata {
  id: string;
  fileId: string;
  userId: string;
  pageCount: number;
  title: string;
  author: string;
  currentPage: number;
  lastReadAt: string;
}

export interface PDFProgress {
  pageNumber: number;
  scrollPosition: number;
  percentage: number;
}

export interface PDFHighlight {
  id: string;
  fileId: string;
  userId: string;
  pageNumber: number;
  color: string;
  text: string;
  rects: any[];
  createdAt: string;
}

export interface PDFBookmark {
  id: string;
  fileId: string;
  userId: string;
  pageNumber: number;
  label: string;
  createdAt: string;
}

export interface PDFNote {
  id: string;
  fileId: string;
  userId: string;
  pageNumber: number;
  content: string;
  x: number;
  y: number;
  createdAt: string;
}

export interface PDFDrawing {
  id: string;
  fileId: string;
  userId: string;
  pageNumber: number;
  strokes: any[];
  createdAt: string;
}

export interface PDFPreferences {
  id: string;
  fileId: string;
  userId: string;
  readingMode: 'light' | 'dark' | 'sepia';
  zoom: number;
  sidebarOpen: boolean;
}

export interface LastReadEntry extends PDFMetadata {
  fileName: string;
  originalName: string;
}

export const pdfApi = {
  getMetadata: (fileId: string) =>
    api.get(`/pdf/metadata/${fileId}`).then(r => r.data as PDFMetadata),

  getProgress: (fileId: string) =>
    api.get(`/pdf/progress/${fileId}`).then(r => r.data as PDFProgress),

  updateProgress: (fileId: string, data: Partial<PDFProgress>) =>
    api.patch(`/pdf/progress/${fileId}`, data).then(r => r.data),

  getLastReads: (limit = 10) =>
    api.get(`/pdf/last-reads?limit=${limit}`).then(r => r.data as LastReadEntry[]),

  getHighlights: (fileId: string, page?: number) => {
    const params = page ? `?page=${page}` : '';
    return api.get(`/pdf/highlights/${fileId}${params}`).then(r => r.data as PDFHighlight[]);
  },

  addHighlight: (fileId: string, data: { pageNumber: number; color?: string; text?: string; rects?: any[] }) =>
    api.post(`/pdf/highlights/${fileId}`, data).then(r => r.data as PDFHighlight),

  deleteHighlight: (id: string) =>
    api.delete(`/pdf/highlights/${id}`).then(r => r.data),

  getBookmarks: (fileId: string) =>
    api.get(`/pdf/bookmarks/${fileId}`).then(r => r.data as PDFBookmark[]),

  addBookmark: (fileId: string, data: { pageNumber: number; label?: string }) =>
    api.post(`/pdf/bookmarks/${fileId}`, data).then(r => r.data as PDFBookmark),

  deleteBookmark: (id: string) =>
    api.delete(`/pdf/bookmarks/${id}`).then(r => r.data),

  getNotes: (fileId: string, page?: number) => {
    const params = page ? `?page=${page}` : '';
    return api.get(`/pdf/notes/${fileId}${params}`).then(r => r.data as PDFNote[]);
  },

  addNote: (fileId: string, data: { pageNumber: number; content: string; x?: number; y?: number }) =>
    api.post(`/pdf/notes/${fileId}`, data).then(r => r.data as PDFNote),

  deleteNote: (id: string) =>
    api.delete(`/pdf/notes/${id}`).then(r => r.data),

  getDrawings: (fileId: string, page?: number) => {
    const params = page ? `?page=${page}` : '';
    return api.get(`/pdf/drawings/${fileId}${params}`).then(r => r.data as PDFDrawing[]);
  },

  addDrawing: (fileId: string, data: { pageNumber: number; strokes: any[] }) =>
    api.post(`/pdf/drawings/${fileId}`, data).then(r => r.data as PDFDrawing),

  deleteDrawing: (id: string) =>
    api.delete(`/pdf/drawings/${id}`).then(r => r.data),

  getPreferences: (fileId: string) =>
    api.get(`/pdf/preferences/${fileId}`).then(r => r.data as PDFPreferences),

  updatePreferences: (fileId: string, data: Partial<PDFPreferences>) =>
    api.patch(`/pdf/preferences/${fileId}`, data).then(r => r.data as PDFPreferences),
};
