import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBookmark, FiX, FiTrash2, FiChevronRight } from 'react-icons/fi';
import { BookmarkData } from '../services/pdfApi';

interface BookmarkToolProps {
  bookmarks: BookmarkData[];
  isAddingBookmark: boolean;
  bookmarkLabel: string;
  isCurrentPageBookmarked: boolean;
  currentPage: number;
  onLabelChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onGoToPage: (page: number) => void;
  onOpen: () => void;
  onCancel: () => void;
}

export default function BookmarkTool({
  bookmarks, isAddingBookmark, bookmarkLabel,
  isCurrentPageBookmarked, currentPage,
  onLabelChange, onAdd, onRemove, onGoToPage,
  onOpen, onCancel,
}: BookmarkToolProps) {
  const [showList, setShowList] = useState(false);

  const currentBookmark = bookmarks.find(b => b.pageNumber === currentPage);

  const handleBookmarkClick = () => {
    if (isCurrentPageBookmarked && currentBookmark) {
      onRemove(currentBookmark.id);
    } else {
      onOpen();
    }
  };

  return (
    <>
      <button
        onClick={handleBookmarkClick}
        className={`p-2 rounded-lg transition-all ${
          isCurrentPageBookmarked
            ? 'bg-cyan/20 text-cyan'
            : 'hover:bg-white/10 text-white/60'
        }`}
        title={isCurrentPageBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <FiBookmark size={16} className={isCurrentPageBookmarked ? 'fill-cyan' : ''} />
      </button>

      <button
        onClick={() => setShowList(!showList)}
        className={`p-2 rounded-lg transition-all ${
          showList ? 'bg-cyan/20 text-cyan' : 'hover:bg-white/10 text-white/40'
        }`}
        title="Bookmarks list"
      >
        <FiChevronRight size={14} />
      </button>

      <AnimatePresence>
        {isAddingBookmark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl border border-white/10 p-5 w-72"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium text-sm">Add Bookmark</h3>
                <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/5 text-white/40">
                  <FiX size={14} />
                </button>
              </div>
              <p className="text-white/40 text-xs mb-2">Page {currentPage}</p>
              <input
                value={bookmarkLabel}
                onChange={e => onLabelChange(e.target.value)}
                placeholder="Bookmark name (optional)"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan/40"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && onAdd()}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 transition-all">
                  Cancel
                </button>
                <button onClick={onAdd} className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-cyan to-blue-500 text-white font-medium hover:opacity-90 transition-all">
                  Add Bookmark
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showList && bookmarks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-16 top-0 w-56 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto custom-scrollbar"
          >
            <div className="p-2 border-b border-white/10">
              <span className="text-xs text-white/40 font-medium px-2">Bookmarks</span>
            </div>
            {bookmarks.map(bm => (
              <button
                key={bm.id}
                onClick={() => { onGoToPage(bm.pageNumber); setShowList(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-all ${
                  bm.pageNumber === currentPage ? 'bg-cyan/10 border-l-2 border-cyan' : ''
                }`}
              >
                <FiBookmark size={12} className="shrink-0 text-cyan" />
                <span className="text-sm text-white/80 flex-1 truncate">{bm.label}</span>
                <span className="text-xs text-white/30 shrink-0">p.{bm.pageNumber}</span>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(bm.id); }}
                  className="p-0.5 rounded hover:bg-white/10 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 size={11} />
                </button>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
