import { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import { pdfApi } from '../services/pdfApi';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export function renderTextLayer(
  textContent: any,
  viewport: any,
  container: HTMLElement
) {
  container.innerHTML = '';
  const textItems = textContent.items as any[];
  textItems.forEach((item: any) => {
    if (!item.str) return;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const span = document.createElement('span');
    span.textContent = item.str;
    span.style.left = tx[4] + 'px';
    span.style.top = tx[5] + 'px';
    span.style.fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) + 'px';
    span.style.fontFamily = item.fontName || '';
    span.style.color = 'transparent';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.pointerEvents = 'auto';
    span.style.cursor = 'text';
    span.style.userSelect = 'text';
    span.style.transformOrigin = '0% 0%';
    container.appendChild(span);
  });
}

export function usePDFViewer(fileId: string) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pdfUrl, setPdfUrl] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await pdfApi.getFileUrl(fileId);
      setPdfUrl(resp);
      const pdf = await pdfjsLib.getDocument(resp).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      const meta = await pdfApi.getMetadata(fileId);
      setCurrentPage(meta?.currentPage || 1);
      const prefs = await pdfApi.getPreferences(fileId);
      setZoom(prefs?.zoom || 1);
    } catch {
      setError('Failed to load PDF');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDoc;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      const vp = page.getViewport({ scale: zoom });
      canvas.width = vp.width;
      canvas.height = vp.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const renderTask = page.render({ canvasContext: ctx, viewport: vp });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;

      const text = await page.getTextContent();
      if (textLayerRef.current) {
        renderTextLayer(text, vp, textLayerRef.current);
      }
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') return;
      toast.error('Failed to render page');
    }
  }, [pdfDoc, zoom]);

  useEffect(() => { loadPdf(); }, [loadPdf]);

  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= numPages) {
      renderPage(currentPage);
    }
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  const goToPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(page, numPages));
    setCurrentPage(p);
    setPanOffset({ x: 0, y: 0 });
    pdfApi.updateProgress(fileId, { pageNumber: p, percentage: numPages > 0 ? Math.round((p / numPages) * 100) : 0 }).catch(() => {});
  }, [numPages, fileId]);

  const goToNext = useCallback(() => {
    if (currentPage < numPages) goToPage(currentPage + 1);
  }, [currentPage, numPages, goToPage]);

  const goToPrev = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  }, [zoomIn, zoomOut]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const startPan = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  }, [panOffset]);

  const movePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
  }, [isPanning, panStart]);

  const stopPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  return {
    pdfDoc, numPages, currentPage, loading, error,
    zoom, panOffset, isPanning, pdfUrl,
    canvasRef, textLayerRef, containerRef, viewerRef,
    goToPage, goToNext, goToPrev,
    zoomIn, zoomOut, resetZoom,
    startPan, movePan, stopPan,
    setZoom,
  };
}
