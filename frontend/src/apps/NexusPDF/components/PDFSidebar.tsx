import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FiX, FiSidebar, FiTrash2, FiClock, FiFileText } from 'react-icons/fi';
import { NoteData } from '../services/pdfApi';

type Tab = 'notes' | 'thumbnails';

interface PDFSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  notes: NoteData[];
  onPageClick: (page: number) => void;
  onNoteDelete: (id: string) => void;
  onClose: () => void;
}

export default function PDFSidebar({
  pdfDoc, currentPage, notes,
  onPageClick, onNoteDelete, onClose,
}: PDFSidebarProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfDoc || tab !== 'thumbnails') return;
    let cancelled = false;
    const doc = pdfDoc;

    async function generate() {
      const thumbs: string[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
        if (cancelled) return;
        try {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          thumbs.push(canvas.toDataURL());
        } catch { thumbs.push(''); }
      }
      if (!cancelled) setThumbnails(thumbs);
    }
    generate();
    return () => { cancelled = true; };
  }, [pdfDoc, tab]);

  useEffect(() => {
    if (listRef.current && tab === 'thumbnails') {
      const el = listRef.current.children[currentPage - 1] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPage, tab]);

  return (
    <div className="w-72 border-l border-white/10 bg-black/60 backdrop-blur-xl flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('notes')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              tab === 'notes' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <FiFileText size={12} className="inline mr-1" />
            Notes
          </button>
          <button
            onClick={() => setTab('thumbnails')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              tab === 'thumbnails' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <FiSidebar size={12} className="inline mr-1" />
            Pages
          </button>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 text-white/30">
          <FiX size={13} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'notes' && (
          <div className="p-3 space-y-2">
            {notes.length === 0 && (
              <div className="text-center text-white/30 py-8">
                <FiFileText size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No notes on this page</p>
              </div>
            )}
            {notes.map(note => (
              <div
                key={note.id}
                className="group p-3 rounded-lg bg-white/5 border border-white/[0.06] hover:border-purple-500/20 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white/80 flex-1 leading-relaxed">{note.content}</p>
                  <button
                    onClick={() => onNoteDelete(note.id)}
                    className="shrink-0 p-1 rounded hover:bg-white/10 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <FiTrash2 size={11} />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <FiClock size={10} className="text-white/20" />
                  <span className="text-[10px] text-white/25">
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'thumbnails' && (
          <div className="space-y-1.5 p-2">
            {thumbnails.length === 0 && (
              <div className="text-center text-white/30 py-8">
                <span className="text-xs">Loading pages...</span>
              </div>
            )}
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
        )}
      </div>
    </div>
  );
}
