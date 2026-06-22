import { RefObject } from 'react';
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
  scrollRef: RefObject<HTMLDivElement | null>;
  pageContainerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  currentPage: number;
  numPages: number;
  readingMode: 'light' | 'dark' | 'sepia';
  highlights: HighlightData[];
  drawingCanvasRef?: RefObject<HTMLCanvasElement | null>;
  drawingEnabled?: boolean;
}

const bgMap = {
  light: '#0B0F19',
  dark: '#030712',
  sepia: '#292524',
};

export default function PDFViewer({
  canvasRef, textLayerRef, scrollRef, pageContainerRef,
  zoom, currentPage, readingMode,
  highlights,
  drawingCanvasRef, drawingEnabled,
}: PDFViewerProps) {
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage || h.pageNumber === 0);

  return (
    <div
      ref={scrollRef as any}
      className="flex-1 overflow-auto"
      style={{ backgroundColor: bgMap[readingMode] }}
    >
      <div className="flex items-start justify-center min-h-full p-4">
        <div
          ref={pageContainerRef as any}
          data-page-container
          className="relative shadow-2xl"
        >
          <canvas
            ref={canvasRef as any}
            className="block select-none"
          />

          <div
            ref={textLayerRef as any}
            className="absolute inset-0 overflow-hidden"
            style={{ lineHeight: 1, pointerEvents: 'auto' }}
          />

          {pageHighlights.map(hl =>
            (hl.rects || []).map((rect, i) => (
              <div
                key={`${hl.id}-${i}`}
                className="absolute pointer-events-none rounded-sm"
                style={{
                  left: rect.x * zoom,
                  top: rect.y * zoom,
                  width: rect.width * zoom,
                  height: rect.height * zoom,
                  backgroundColor: (COLOR_MAP[hl.color] || COLOR_MAP.yellow) + '4D',
                  mixBlendMode: 'multiply',
                }}
              />
            ))
          )}

          {drawingEnabled && drawingCanvasRef && (
            <canvas
              ref={drawingCanvasRef as any}
              className="absolute inset-0 z-30"
              style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
