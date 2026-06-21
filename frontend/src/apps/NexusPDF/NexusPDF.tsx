import { useState, useEffect, useCallback, useRef } from 'react';
import { FiArrowLeft, FiArrowRight, FiMaximize2, FiMinimize2, FiChevronLeft, FiFolder, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { pdfApi, LastReadEntry } from './services/pdfApi';
import { usePDFReader } from './hooks/usePDFReader';
import PDFViewer from './components/PDFViewer';
import ThumbnailSidebar from './components/ThumbnailSidebar';
import SmartTools from './components/SmartTools';
import ReadingPreferences from './components/ReadingPreferences';
import './NexusPDF.css';
import api from '../../services/api';

interface NexusPDFProps {
  fileId: string;
  onBack?: () => void;
}

export default function NexusPDF({ fileId, onBack }: NexusPDFProps) {
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const {
    numPages, currentPage, loading,
    highlights, bookmarks, notes, preferences, fullscreen,
    setNumPages, goToPage, goToNextPage, goToPrevPage,
    addHighlight, removeHighlight,
    addBookmark, removeBookmark, isPageBookmarked,
    addNote,
    updatePreferences, toggleFullscreen,
  } = usePDFReader({ fileId });

  useEffect(() => {
    async function loadPdfUrl() {
      try {
        const resp = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
        const url = URL.createObjectURL(resp.data as Blob);
        setPdfUrl(url);
      } catch {
        setError('Failed to load PDF file');
      }
    }
    loadPdfUrl();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [fileId]);

  const handleTextSelected = useCallback((text: string, rects: any[]) => {
    if (text) {
      addHighlight({ pageNumber: currentPage, text, rects, color: 'yellow' });
    }
  }, [currentPage, addHighlight]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goToNextPage();
      else goToPrevPage();
    }
  }, [goToNextPage, goToPrevPage]);

  const progressPct = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;

  const modeBgMap = {
    light: 'bg-[#0B0F19]',
    dark: 'bg-gray-950',
    sepia: 'bg-amber-950',
  };

  const modeBorderMap = {
    light: 'border-white/10',
    dark: 'border-white/5',
    sepia: 'border-amber-800/30',
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="text-center">
          <FiFolder size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60 text-lg">{error}</p>
          <button onClick={() => navigate('/studio')} className="mt-4 px-4 py-2 rounded-lg bg-cyan/20 text-cyan hover:bg-cyan/30">
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${modeBgMap[preferences.readingMode]} ${fullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${modeBorderMap[preferences.readingMode]} bg-black/40 backdrop-blur-xl z-20`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack || (() => navigate('/studio'))}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 transition-all"
          >
            <FiChevronLeft size={18} />
          </button>
          <span className="text-white/70 text-sm font-medium">
            {currentPage} <span className="text-white/30">/ {numPages}</span>
          </span>
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan to-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-white/30 text-xs ml-1">{progressPct}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SmartTools
            currentPage={currentPage}
            isBookmarked={isPageBookmarked(currentPage)}
            onAddHighlight={addHighlight}
            onRemoveHighlight={removeHighlight}
            onAddBookmark={(data) => addBookmark(data)}
            onRemoveBookmark={(id) => removeBookmark(id)}
            onAddNote={addNote}
            onToggleDraw={() => {}}
          />
          <ReadingPreferences
            readingMode={preferences.readingMode}
            zoom={preferences.zoom}
            fullscreen={fullscreen}
            onModeChange={(mode) => updatePreferences({ readingMode: mode })}
            onZoomChange={(zoom) => updatePreferences({ zoom })}
            onToggleFullscreen={toggleFullscreen}
          />
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 rounded-lg transition-all ${showThumbnails ? 'bg-cyan/20 text-cyan' : 'hover:bg-white/10 text-white/40'}`}
            title="Thumbnails"
          >
            <FiMaximize2 size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition-all ${fullscreen ? 'bg-cyan/20 text-cyan' : 'hover:bg-white/10 text-white/40'}`}
            title="Fullscreen"
          >
            {fullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pdfUrl ? (
          <PDFViewer
            url={pdfUrl}
            currentPage={currentPage}
            zoom={preferences.zoom}
            readingMode={preferences.readingMode}
            onNumPages={setNumPages}
            onTextSelected={handleTextSelected}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30">Loading PDF...</p>
          </div>
        )}

        {/* Thumbnail sidebar */}
        {showThumbnails && pdfUrl && (
          <ThumbnailSidebar
            url={pdfUrl}
            currentPage={currentPage}
            numPages={numPages}
            onPageClick={goToPage}
            onClose={() => setShowThumbnails(false)}
          />
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-t ${modeBorderMap[preferences.readingMode]} bg-black/60 backdrop-blur-xl z-20`}>
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/60 disabled:opacity-30 transition-all"
        >
          <FiArrowLeft size={14} />
          <span className="text-xs hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= numPages) goToPage(v);
            }}
            className="w-14 text-center bg-white/10 rounded-lg px-2 py-1 text-sm text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-white/30 text-xs">/ {numPages}</span>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= numPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/60 disabled:opacity-30 transition-all"
        >
          <span className="text-xs hidden sm:inline">Next</span>
          <FiArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
