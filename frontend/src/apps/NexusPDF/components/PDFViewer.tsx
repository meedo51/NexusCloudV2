import { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  currentPage: number;
  zoom: number;
  readingMode: 'light' | 'dark' | 'sepia';
  onPageRendered?: (pageNumber: number) => void;
  onNumPages?: (count: number) => void;
  onTextSelected?: (text: string, rects: any[]) => void;
}

export default function PDFViewer({
  url, currentPage, zoom, readingMode,
  onPageRendered, onNumPages, onTextSelected,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        onNumPages?.(pdf.numPages);
      } catch {
        console.error('Failed to load PDF');
      }
    }
    loadPdf();
    return () => { cancelled = true; };
  }, [url, onNumPages]);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    setRendering(true);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });
      const container = containerRef.current;
      if (container) {
        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (readingMode === 'dark') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (readingMode === 'sepia') {
        ctx.fillStyle = '#f5e6c8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      onPageRendered?.(pageNum);
    } catch {
      console.error('Failed to render page', pageNum);
    } finally {
      setRendering(false);
    }
  }, [zoom, readingMode, onPageRendered]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      onTextSelected?.('', []);
      return;
    }
    const text = selection.toString();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const rects = [{
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      w: rect.width,
      h: rect.height,
    }];
    onTextSelected?.(text, rects);
  }, [onTextSelected]);

  const bgMap = { light: 'bg-[#0B0F19]', dark: 'bg-gray-950', sepia: 'bg-amber-950' };

  return (
    <div className={`flex-1 overflow-auto custom-scrollbar ${bgMap[readingMode]} relative`} ref={containerRef}>
      <div className="flex flex-col items-center py-4 min-h-full">
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseUp={handleMouseUp}
          className="shadow-2xl rounded-sm"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}
