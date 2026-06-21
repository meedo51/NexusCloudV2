import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ThumbnailSidebarProps {
  url: string;
  currentPage: number;
  numPages: number;
  onPageClick: (page: number) => void;
  onClose: () => void;
}

export default function ThumbnailSidebar({ url, currentPage, numPages, onPageClick, onClose }: ThumbnailSidebarProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        const thumbs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs.push(canvas.toDataURL());
          }
          if (cancelled) return;
        }
        if (!cancelled) setThumbnails(thumbs);
      } catch {
        console.error('Failed to generate thumbnails');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    setScrollToIndex(currentPage - 1);
  }, [currentPage]);

  useEffect(() => {
    if (scrollToIndex !== null && listRef.current) {
      const el = listRef.current.children[scrollToIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollToIndex(null);
    }
  }, [scrollToIndex]);

  return (
    <div className="w-48 border-l border-white/10 bg-black/30 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <span className="text-white/60 text-xs font-medium">Pages</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/40">
          <FiX size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2" ref={listRef}>
        {thumbnails.map((thumb, i) => (
          <button
            key={i}
            onClick={() => onPageClick(i + 1)}
            className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
              currentPage === i + 1
                ? 'border-cyan shadow-lg shadow-cyan/20'
                : 'border-white/5 hover:border-white/20'
            }`}
          >
            <img src={thumb} alt={`Page ${i + 1}`} className="w-full" />
            <div className={`text-[10px] text-center py-1 ${
              currentPage === i + 1 ? 'bg-cyan/20 text-cyan' : 'bg-white/5 text-white/40'
            }`}>
              {i + 1}
            </div>
          </button>
        ))}
      </div>
      <div className="p-2 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
        <span>{currentPage} / {numPages}</span>
      </div>
    </div>
  );
}
