import { useState, useCallback, useEffect } from 'react';
import { pdfApi, BookmarkData } from '../services/pdfApi';

export function useBookmarks(fileId: string, currentPage: number) {
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await pdfApi.getBookmarks(fileId);
      setBookmarks(data);
    } catch { /* ignore */ }
  }, [fileId]);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  const addBookmark = useCallback(async () => {
    try {
      const bm = await pdfApi.addBookmark(fileId, {
        pageNumber: currentPage,
        label: bookmarkLabel || `Page ${currentPage}`,
      });
      setBookmarks(prev => [...prev, bm]);
      setBookmarkLabel('');
      setIsAddingBookmark(false);
      return bm;
    } catch {
      return null;
    }
  }, [fileId, currentPage, bookmarkLabel]);

  const removeBookmark = useCallback(async (id: string) => {
    try {
      await pdfApi.deleteBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch { /* ignore */ }
  }, []);

  const isCurrentPageBookmarked = bookmarks.some(b => b.pageNumber === currentPage);

  return {
    bookmarks, isAddingBookmark, bookmarkLabel, isCurrentPageBookmarked,
    setIsAddingBookmark, setBookmarkLabel,
    addBookmark, removeBookmark,
  };
}
