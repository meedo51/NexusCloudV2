import { useState, useEffect, useCallback, useRef } from 'react';
import { pdfApi, PDFPreferences, PDFHighlight, PDFBookmark, PDFNote, PDFDrawing } from '../services/pdfApi';

interface UsePDFReaderOptions {
  fileId: string;
}

export function usePDFReader({ fileId }: UsePDFReaderOptions) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<PDFHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<PDFBookmark[]>([]);
  const [notes, setNotes] = useState<PDFNote[]>([]);
  const [drawings, setDrawings] = useState<PDFDrawing[]>([]);
  const [preferences, setPreferences] = useState<PDFPreferences>({
    id: '', fileId, userId: '', readingMode: 'light', zoom: 1, sidebarOpen: true,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAnnotations = useCallback(async () => {
    try {
      const [hls, bms, nts, drws] = await Promise.all([
        pdfApi.getHighlights(fileId),
        pdfApi.getBookmarks(fileId),
        pdfApi.getNotes(fileId),
        pdfApi.getDrawings(fileId),
      ]);
      setHighlights(hls);
      setBookmarks(bms);
      setNotes(nts);
      setDrawings(drws);
    } catch { /* non-fatal */ }
  }, [fileId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [meta, prefs] = await Promise.all([
          pdfApi.getMetadata(fileId),
          pdfApi.getPreferences(fileId),
        ]);
        if (cancelled) return;
        setNumPages(meta.pageCount || 0);
        setCurrentPage(meta.currentPage || 1);
        setPreferences(prefs);
        await loadAnnotations();
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [fileId, loadAnnotations]);

  const saveProgress = useCallback((page: number, percentage: number) => {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      pdfApi.updateProgress(fileId, { pageNumber: page, percentage }).catch(() => {});
    }, 1000);
  }, [fileId]);

  const goToPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(page, numPages || 1));
    setCurrentPage(p);
    const pct = numPages > 0 ? Math.round((p / numPages) * 100) : 0;
    saveProgress(p, pct);
  }, [numPages, saveProgress]);

  const goToNextPage = useCallback(() => {
    if (currentPage < (numPages || 1)) goToPage(currentPage + 1);
  }, [currentPage, numPages, goToPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const addHighlight = useCallback(async (data: { pageNumber: number; color?: string; text?: string; rects?: any[] }) => {
    try {
      const hl = await pdfApi.addHighlight(fileId, data);
      setHighlights(prev => [hl, ...prev]);
      return hl;
    } catch { return null; }
  }, [fileId]);

  const removeHighlight = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch { /* ignore */ }
  }, []);

  const addBookmark = useCallback(async (data: { pageNumber: number; label?: string }) => {
    try {
      const bm = await pdfApi.addBookmark(fileId, data);
      setBookmarks(prev => [...prev, bm]);
      return bm;
    } catch { return null; }
  }, [fileId]);

  const removeBookmark = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch { /* ignore */ }
  }, []);

  const addNote = useCallback(async (data: { pageNumber: number; content: string; x?: number; y?: number }) => {
    try {
      const note = await pdfApi.addNote(fileId, data);
      setNotes(prev => [note, ...prev]);
      return note;
    } catch { return null; }
  }, [fileId]);

  const removeNote = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  }, []);

  const saveDrawings = useCallback(async (pageNumber: number, strokes: any[]) => {
    try {
      const drw = await pdfApi.addDrawing(fileId, { pageNumber, strokes });
      setDrawings(prev => [...prev.filter(d => d.pageNumber !== pageNumber), drw]);
      return drw;
    } catch { return null; }
  }, [fileId]);

  const updatePreferences = useCallback(async (data: Partial<PDFPreferences>) => {
    setPreferences(prev => ({ ...prev, ...data }));
    try {
      await pdfApi.updatePreferences(fileId, data);
    } catch { /* ignore */ }
  }, [fileId]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => !prev);
  }, []);

  const isPageBookmarked = useCallback((page: number) => {
    return bookmarks.some(b => b.pageNumber === page);
  }, [bookmarks]);

  return {
    numPages, currentPage, loading, error,
    highlights, bookmarks, notes, drawings, preferences, fullscreen,
    setNumPages, goToPage, goToNextPage, goToPrevPage,
    addHighlight, removeHighlight,
    addBookmark, removeBookmark, isPageBookmarked,
    addNote, removeNote,
    saveDrawings,
    updatePreferences, toggleFullscreen,
    loadAnnotations,
  };
}
