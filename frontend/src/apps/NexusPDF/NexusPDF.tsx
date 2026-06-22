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
import ThumbnailSidebar from './components/ThumbnailSidebar';

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
    highlights, selectedText, hlColor, showPopup, popupPos,
    setHlColor, applyHighlight, removeHighlight,
  } = useHighlights(fileId, viewer.containerRef, viewer.currentPage);
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
    drawings, isDrawing, currentStroke,
    startStroke, addPoint, endStroke,
    clearPageDrawings, setIsDrawing,
  } = useDrawings(fileId, viewer.currentPage);

  const [prefs, setPrefs] = useState<PDFPreferences>({ readingMode: 'light', zoom: 1, sidebarOpen: true });
  const [showThumbnails, setShowThumbnails] = useState(true);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDrawing) return;
    viewer.startPan(e.clientX, e.clientY);
  }, [viewer, isDrawing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing) return;
    viewer.movePan(e.clientX, e.clientY);
  }, [viewer, isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) return;
    viewer.stopPan();
  }, [viewer, isDrawing]);

  const handleAddNote = useCallback(async () => {
    const result = await addNote();
    if (result) toast.success('Note added');
  }, [addNote]);

  const handleAddBookmark = useCallback(async () => {
    const result = await addBookmark();
    if (result) toast.success('Bookmark added');
  }, [addBookmark]);

  const handleDrawToggle = useCallback(() => {
    setIsDrawing(!isDrawing);
  }, [isDrawing, setIsDrawing]);

  const handleDrawPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = viewer.containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let cx: number, cy: number;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      cx = t.clientX - rect.left;
      cy = t.clientY - rect.top;
    } else {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }
    startStroke(cx, cy);
  }, [isDrawing, startStroke, viewer.containerRef]);

  const handleDrawPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = viewer.containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let cx: number, cy: number;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      cx = t.clientX - rect.left;
      cy = t.clientY - rect.top;
    } else {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }
    addPoint(cx, cy);
  }, [isDrawing, addPoint, viewer.containerRef]);

  const handleDrawPointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    endStroke();
  }, [isDrawing, endStroke]);

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
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-lg transition-all ${showThumbnails ? 'bg-cyan/20 text-cyan' : 'hover:bg-white/10 text-white/40'}`}
            title="Toggle thumbnails"
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
            onContentChange={setNoteContent}
            onAdd={handleAddNote}
            onCancel={() => { setIsAddingNote(false); setNoteContent(''); }}
            onOpen={() => setIsAddingNote(true)}
          />

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleDrawToggle}
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
        <div className="flex-1 relative">
          {viewer.loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PDFViewer
              canvasRef={viewer.canvasRef}
              textLayerRef={viewer.textLayerRef}
              containerRef={viewer.containerRef}
              zoom={viewer.zoom}
              panOffset={viewer.panOffset}
              isPanning={viewer.isPanning}
              currentPage={viewer.currentPage}
              numPages={viewer.numPages}
              readingMode={prefs.readingMode}
              highlights={highlights}
              notes={notes}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onNoteDelete={removeNote}
            />
          )}

          {/* Drawing overlay */}
          {isDrawing && (
            <div
              className="absolute inset-0 z-30"
              style={{ cursor: 'crosshair' }}
              onMouseDown={handleDrawPointerDown}
              onMouseMove={handleDrawPointerMove}
              onMouseUp={handleDrawPointerUp}
              onMouseLeave={handleDrawPointerUp}
              onTouchStart={handleDrawPointerDown}
              onTouchMove={handleDrawPointerMove}
              onTouchEnd={handleDrawPointerUp}
            />
          )}

          {/* Drawing stroke preview */}
          {isDrawing && currentStroke.current.length > 1 && (
            <svg className="absolute inset-0 z-20 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              <polyline
                points={currentStroke.current.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#A78BFA"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Thumbnail sidebar */}
        {showThumbnails && (
          <ThumbnailSidebar
            pdfDoc={viewer.pdfDoc}
            currentPage={viewer.currentPage}
            onPageClick={viewer.goToPage}
            onClose={() => setShowThumbnails(false)}
          />
        )}
      </div>

      {/* Highlight popup */}
      <HighlighterTool
        show={showPopup}
        x={popupPos.x}
        y={popupPos.y}
        selectedText={selectedText}
        highlightColor={hlColor}
        onColorChange={setHlColor}
        onApply={applyHighlight}
        onClose={() => {
          window.getSelection()?.removeAllRanges();
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
          <span className="text-xs text-white/30">Ctrl+scroll to zoom · Drag to pan</span>
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
