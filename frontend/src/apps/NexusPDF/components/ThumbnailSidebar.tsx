import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FiX, FiChevronLeft, FiChevronRight, FiSidebar } from 'react-icons/fi';

interface ThumbnailSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageClick: (page: number) => void;
  onClose: () => void;
}

export default function ThumbnailSidebar({ pdfDoc, currentPage, onPageClick, onClose }: ThumbnailSidebarProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    const doc = pdfDoc;

    async function generate() {
      const thumbs: string[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
        if (cancelled) return;
        try {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          thumbs.push(canvas.toDataURL());
        } catch {
          thumbs.push('');
        }
      }
      if (!cancelled) setThumbnails(thumbs);
    }
    generate();
    return () => { cancelled = true; };
  }, [pdfDoc]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[currentPage - 1] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPage]);

  if (!pdfDoc) return null;

  return (
    <div className="w-44 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-white/50 text-xs font-medium flex items-center gap-1.5">
          <FiSidebar size={12} />
          Pages
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 text-white/30">
          <FiX size={13} />
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 p-2">
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
            {thumb ? (
              <img src={thumb} alt={`Page ${i + 1}`} className="w-full" />
            ) : (
              <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center">
                <span className="text-white/20 text-xs">{i + 1}</span>
              </div>
            )}
            <div className={`text-[10px] text-center py-0.5 ${
              currentPage === i + 1 ? 'bg-cyan/20 text-cyan' : 'bg-white/5 text-white/40'
            }`}>
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
