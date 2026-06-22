import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiSun, FiMoon, FiLayers, FiMaximize2, FiPenTool, FiTrash2, FiSidebar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { pdfApi, PDFPreferences } from './services/pdfApi';
import { usePDFViewer } from './hooks/usePDFViewer';
import { useHighlights } from './hooks/useHighlights';
import { useNotes } from './hooks/useNotes';
import { useBookmarks } from './hooks/useBookmarks';
import { useDrawings } from './hooks/useDrawings';
import PDFViewer from './components/PDFViewer';
import HighlighterTool from './components/HighlighterTool';
import NoteTool from './components/NoteTool';
import BookmarkTool from './components/BookmarkTool';
import ZoomControls from './components/ZoomControls';
import PDFNavigation from './components/PDFNavigation';
import PDFSidebar from './components/PDFSidebar';

const DRAW_COLORS = ['#00F0FF', '#FF6B6B', '#FFD93D', '#4ADE80', '#A78BFA', '#FFFFFF'];

interface NexusPDFProps {
  fileId: string;
  onBack?: () => void;
}

const readingModes: { key: PDFPreferences['readingMode']; icon: typeof FiSun; label: string }[] = [
  { key: 'light', icon: FiSun, label: 'Light' },
  { key: 'dark', icon: FiMoon, label: 'Dark' },
  { key: 'sepia', icon: FiLayers, label: 'Sepia' },
];

export default function NexusPDF({ fileId, onBack }: NexusPDFProps) {
  const navigate = useNavigate();
  const viewer = usePDFViewer(fileId);
  const {
    highlights, selectedText, hlColor, showPopup, toolbarPos,
    setHlColor, applyHighlight, removeHighlight, dismissPopup,
  } = useHighlights(fileId, viewer.textLayerRef, viewer.pageContainerRef, viewer.currentPage, viewer.zoom);
  const {
    notes, isAddingNote, noteContent,
    setIsAddingNote, setNoteContent,
    addNote, removeNote,
  } = useNotes(fileId, viewer.currentPage);
  const {
    bookmarks, isAddingBookmark, bookmarkLabel,
    isCurrentPageBookmarked, setIsAddingBookmark, setBookmarkLabel,
    addBookmark, removeBookmark,
  } = useBookmarks(fileId, viewer.currentPage);
  const {
    drawings, isDrawing, color: drawColor, brushSize,
    setIsDrawing, setColor: setDrawColor, setBrushSize,
    saveStroke, clearPageDrawings,
  } = useDrawings(fileId, viewer.currentPage);

  const [prefs, setPrefs] = useState<PDFPreferences>({ readingMode: 'light', zoom: 1, sidebarOpen: true });
  const [showSidebar, setShowSidebar] = useState(true);

  // Drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const allStrokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);

  const pageWidth = viewer.viewport?.width || 0;
  const pageHeight = viewer.viewport?.height || 0;
  const z = viewer.zoom;

  // Sync drawing canvas dims
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !pageWidth) return;
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    ctxRef.current = canvas.getContext('2d');
  }, [pageWidth, pageHeight]);

  // Load existing drawings
  useEffect(() => {
    allStrokesRef.current = drawings.flatMap(d => d.strokes);
    redrawAllStrokes();
  }, [drawings, pageWidth, pageHeight]);

  const redrawAllStrokes = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokesRef.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke[0].x * z, stroke[0].y * z);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * z, stroke[i].y * z);
      }
      ctx.stroke();
    });
  }, [drawColor, brushSize, z]);

  const getDrawPos = useCallback((clientX: number, clientY: number) => {
    const cr = drawCanvasRef.current?.getBoundingClientRect();
    if (!cr) return { x: 0, y: 0 };
    return {
      x: (clientX - cr.left) / z,
      y: (clientY - cr.top) / z,
    };
  }, [z]);

  // Redraw when color/size changes
  useEffect(() => { redrawAllStrokes(); }, [drawColor, brushSize, redrawAllStrokes]);

  // Native event handlers for drawing canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !isDrawing) return;

    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      const pos = getDrawPos(e.clientX, e.clientY);
      isDrawingRef.current = true;
      currentStrokeRef.current = [pos];
    };
    const onMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getDrawPos(e.clientX, e.clientY);
      currentStrokeRef.current.push(pos);
      const ctx = ctxRef.current;
      if (!ctx) return;
      const pts = currentStrokeRef.current;
      if (pts.length < 2) return;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x * z, pts[pts.length - 2].y * z);
      ctx.lineTo(pts[pts.length - 1].x * z, pts[pts.length - 1].y * z);
      ctx.stroke();
    };
    const onUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const stroke = currentStrokeRef.current;
      if (stroke.length >= 2) {
        allStrokesRef.current.push(stroke);
        saveStroke(allStrokesRef.current);
      }
      currentStrokeRef.current = [];
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);

    const onTouchDown = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = getDrawPos(t.clientX, t.clientY);
      isDrawingRef.current = true;
      currentStrokeRef.current = [pos];
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const pos = getDrawPos(t.clientX, t.clientY);
      currentStrokeRef.current.push(pos);
      const ctx = ctxRef.current;
      if (!ctx) return;
      const pts = currentStrokeRef.current;
      if (pts.length < 2) return;
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x * z, pts[pts.length - 2].y * z);
      ctx.lineTo(pts[pts.length - 1].x * z, pts[pts.length - 1].y * z);
      ctx.stroke();
    };
    const onTouchEnd = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const stroke = currentStrokeRef.current;
      if (stroke.length >= 2) {
        allStrokesRef.current.push(stroke);
        saveStroke(allStrokesRef.current);
      }
      currentStrokeRef.current = [];
    };

    canvas.addEventListener('touchstart', onTouchDown, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    document.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onTouchDown);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDrawing, drawColor, brushSize, z, saveStroke, getDrawPos]);

  // ---- End drawing state ----

  useEffect(() => {
    pdfApi.getPreferences(fileId).then(p => {
      if (p) setPrefs(p);
    }).catch(() => {});
  }, [fileId]);

  const updatePrefs = useCallback(async (data: Partial<PDFPreferences>) => {
    const next = { ...prefs, ...data };
    setPrefs(next);
    await pdfApi.updatePreferences(fileId, data).catch(() => {});
  }, [fileId, prefs]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleAddNote = useCallback(async () => {
    const result = await addNote();
    if (result) toast.success('Note added');
  }, [addNote]);

  const handleAddBookmark = useCallback(async () => {
    const result = await addBookmark();
    if (result) toast.success('Bookmark added');
  }, [addBookmark]);

  const bgMap = { light: 'bg-[#0B0F19]', dark: 'bg-gray-950', sepia: 'bg-amber-950' };
  const borderMap = { light: 'border-white/10', dark: 'border-white/5', sepia: 'border-amber-800/30' };

  if (viewer.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="text-center">
          <p className="text-white/60 text-lg">{viewer.error}</p>
          <button onClick={() => navigate('/pdf')} className="mt-4 px-4 py-2 rounded-lg bg-cyan/20 text-cyan hover:bg-cyan/30 transition-all">
            Back
          </button>
        </div>
      </div>
    );
  }

  const progressPct = viewer.numPages > 0 ? Math.round((viewer.currentPage / viewer.numPages) * 100) : 0;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${bgMap[prefs.readingMode]}`}>

      {/* Top bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b ${borderMap[prefs.readingMode]} bg-black/40 backdrop-blur-xl z-20 shrink-0`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack || (() => navigate('/pdf'))}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-all"
          >
            <FiChevronLeft size={16} />
          </button>
          <span className="text-white/70 text-sm font-medium">
            {viewer.currentPage} <span className="text-white/30">/ {viewer.numPages}</span>
          </span>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan to-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-white/30 text-xs">{progressPct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1.5 rounded-lg transition-all ${showSidebar ? 'bg-cyan/20 text-cyan' : 'hover:bg-white/10 text-white/40'}`}
            title="Toggle sidebar"
          >
            <FiSidebar size={13} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <ZoomControls
            zoom={viewer.zoom}
            onZoomIn={viewer.zoomIn}
            onZoomOut={viewer.zoomOut}
            onReset={viewer.resetZoom}
          />

          <div className="w-px h-5 bg-white/10 mx-1" />

          <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
            {readingModes.map(m => (
              <button
                key={m.key}
                onClick={() => updatePrefs({ readingMode: m.key })}
                className={`p-1.5 rounded-md transition-all ${
                  prefs.readingMode === m.key ? 'bg-cyan/20 text-cyan' : 'text-white/40 hover:text-white/70'
                }`}
                title={m.label}
              >
                <m.icon size={13} />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <BookmarkTool
            bookmarks={bookmarks}
            isAddingBookmark={isAddingBookmark}
            bookmarkLabel={bookmarkLabel}
            isCurrentPageBookmarked={isCurrentPageBookmarked}
            currentPage={viewer.currentPage}
            onLabelChange={setBookmarkLabel}
            onAdd={handleAddBookmark}
            onRemove={removeBookmark}
            onGoToPage={viewer.goToPage}
            onOpen={() => { setBookmarkLabel(`Page ${viewer.currentPage}`); setIsAddingBookmark(true); }}
            onCancel={() => { setIsAddingBookmark(false); setBookmarkLabel(''); }}
          />

          <NoteTool
            isAddingNote={isAddingNote}
            noteContent={noteContent}
            currentPage={viewer.currentPage}
            onContentChange={setNoteContent}
            onAdd={handleAddNote}
            onCancel={() => { setIsAddingNote(false); setNoteContent(''); }}
            onOpen={() => setIsAddingNote(true)}
          />

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsDrawing(!isDrawing)}
              className={`p-1.5 rounded-lg transition-all ${
                isDrawing ? 'bg-violet-500/20 text-violet ring-1 ring-violet/30' : 'hover:bg-white/10 text-white/40'
              }`}
              title={isDrawing ? 'Disable drawing' : 'Enable drawing'}
            >
              <FiPenTool size={13} />
            </button>
            {isDrawing && (
              <button
                onClick={clearPageDrawings}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
                title="Clear page drawings"
              >
                <FiTrash2 size={12} />
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 transition-all"
            title="Fullscreen"
          >
            <FiMaximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Main viewer area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex">
          {viewer.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PDFViewer
              canvasRef={viewer.canvasRef}
              textLayerRef={viewer.textLayerRef}
              scrollRef={viewer.scrollRef}
              pageContainerRef={viewer.pageContainerRef}
              zoom={viewer.zoom}
              currentPage={viewer.currentPage}
              numPages={viewer.numPages}
              readingMode={prefs.readingMode}
              highlights={highlights}
              drawingCanvasRef={drawCanvasRef}
              drawingEnabled={isDrawing}
            />
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <PDFSidebar
            pdfDoc={viewer.pdfDoc}
            currentPage={viewer.currentPage}
            notes={notes}
            onPageClick={viewer.goToPage}
            onNoteDelete={removeNote}
            onClose={() => setShowSidebar(false)}
          />
        )}
      </div>

      {/* Drawing controls */}
      {isDrawing && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 p-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
          <div className="flex gap-1.5">
            {DRAW_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  drawColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-6">{brushSize}px</span>
            <input
              type="range"
              min="1"
              max="12"
              value={brushSize}
              onChange={e => setBrushSize(parseInt(e.target.value))}
              className="w-20 accent-violet-500"
            />
          </div>
        </div>
      )}

      {/* Highlight toolbar */}
      <HighlighterTool
        show={showPopup}
        x={toolbarPos.x}
        y={toolbarPos.y}
        selectedText={selectedText}
        highlightColor={hlColor}
        onColorChange={setHlColor}
        onApply={applyHighlight}
        onClose={() => {
          window.getSelection()?.removeAllRanges();
          dismissPopup();
        }}
      />

      {/* Bottom bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-t ${borderMap[prefs.readingMode]} bg-black/60 backdrop-blur-xl z-20 shrink-0`}>
        <PDFNavigation
          currentPage={viewer.currentPage}
          numPages={viewer.numPages}
          onPrev={viewer.goToPrev}
          onNext={viewer.goToNext}
          onPageChange={viewer.goToPage}
        />
        {viewer.zoom > 1 && !isDrawing && (
          <span className="text-xs text-white/30 hidden sm:block">Ctrl+Scroll to zoom · Scroll to pan</span>
        )}
        <button
          onClick={viewer.resetZoom}
          className="text-xs text-cyan/70 hover:text-cyan transition-all"
        >
          Fit page
        </button>
      </div>
    </div>
  );
}
