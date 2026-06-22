import { RefObject, MouseEvent } from 'react';
import { HighlightData } from '../services/pdfApi';

const COLOR_MAP: Record<string, string> = {
  yellow: '#FFD700',
  green: '#4ADE80',
  blue: '#60A5FA',
  pink: '#F472B6',
  purple: '#A78BFA',
};

interface PDFViewerProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  textLayerRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  panOffset: { x: number; y: number };
  isPanning: boolean;
  currentPage: number;
  numPages: number;
  readingMode: 'light' | 'dark' | 'sepia';
  highlights: HighlightData[];
  notes: { id: string; pageNumber: number; content: string; x: number; y: number }[];
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onNoteDelete: (id: string) => void;
}

const bgMap = {
  light: '#0B0F19',
  dark: '#030712',
  sepia: '#292524',
};

export default function PDFViewer({
  canvasRef, textLayerRef, containerRef,
  zoom, panOffset, isPanning,
  currentPage, numPages, readingMode,
  highlights, notes,
  onMouseDown, onMouseMove, onMouseUp,
  onNoteDelete,
}: PDFViewerProps) {
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage || h.pageNumber === 0);
  const pageNotes = notes.filter(n => n.pageNumber === currentPage);

  return (
    <div
      ref={containerRef as any}
      className="relative flex-1 overflow-hidden"
      style={{ backgroundColor: bgMap[readingMode] }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="flex items-start justify-center min-h-full p-4">
        <div
          className="relative shadow-2xl"
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'top left',
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
            transition: isPanning ? 'none' : 'transform 0.2s ease',
          }}
        >
          <canvas
            ref={canvasRef as any}
            className="block select-none"
          />

          <div
            ref={textLayerRef as any}
            className="absolute inset-0 overflow-hidden"
            style={{ lineHeight: 1 }}
          />

          {pageHighlights.map(hl =>
            (hl.rects || []).map((rect, i) => (
              <div
                key={`${hl.id}-${i}`}
                className="absolute pointer-events-none rounded-sm"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  backgroundColor: (COLOR_MAP[hl.color] || COLOR_MAP.yellow) + '4D',
                  mixBlendMode: 'multiply',
                }}
              />
            ))
          )}

          {pageNotes.map(note => (
            <div
              key={note.id}
              className="absolute w-56 p-2.5 rounded-lg backdrop-blur-xl border shadow-xl group"
              style={{
                left: note.x,
                top: note.y,
                backgroundColor: 'rgba(251, 191, 36, 0.08)',
                borderColor: 'rgba(251, 191, 36, 0.25)',
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-white/90 leading-relaxed">{note.content}</p>
                <button
                  onClick={() => onNoteDelete(note.id)}
                  className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
