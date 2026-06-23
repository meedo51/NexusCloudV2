import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Listen for auth token from parent (NexusCloud IFrame)
window.addEventListener('message', (event) => {
  if (event.data?.type === 'DOCUPRO_AUTH') {
    const token = event.data.token;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
});

// Also check URL param for initial token (fallback)
const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
const tokenParam = params.get('token');
if (tokenParam) {
  api.defaults.headers.common['Authorization'] = `Bearer ${tokenParam}`;
}

export const docuproApi = {
  word: {
    list: () => api.get('/docupro/word/documents'),
    get: (id: string) => api.get(`/docupro/word/documents/${id}`),
    create: (data: any) => api.post('/docupro/word/documents', data),
    update: (id: string, data: any) => api.put(`/docupro/word/documents/${id}`, data),
    delete: (id: string) => api.delete(`/docupro/word/documents/${id}`),
    versions: (id: string) => api.get(`/docupro/word/documents/${id}/versions`),
  },
  excel: {
    list: () => api.get('/docupro/excel/spreadsheets'),
    get: (id: string) => api.get(`/docupro/excel/spreadsheets/${id}`),
    create: (data: any) => api.post('/docupro/excel/spreadsheets', data),
    update: (id: string, data: any) => api.put(`/docupro/excel/spreadsheets/${id}`, data),
    delete: (id: string) => api.delete(`/docupro/excel/spreadsheets/${id}`),
    syncCells: (id: string, data: any) => api.post(`/docupro/excel/spreadsheets/${id}/sync`, data),
  },
  pdf: {
    list: () => api.get('/docupro/pdf/documents'),
    merge: (data: any) => api.post('/docupro/pdf/merge', data),
    annotate: (data: any) => api.post('/docupro/pdf/annotate', data),
    extractText: (fileId: string) => api.post('/docupro/pdf/extract-text', { fileId }),
  },
};

export default api;
