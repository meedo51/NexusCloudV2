import { useState, useEffect, useCallback, useRef } from 'react';
import { FiRefreshCw, FiImage, FiFolder, FiChevronRight } from 'react-icons/fi';
import { filesApi } from '../../services/api';
import { fetchImageAsDataUrl } from '../../utils/imageUtils';
import type { FileItem } from '../../types';
import Breadcrumb from './Breadcrumb';
import FolderCard from './FolderCard';
import ImageCard from './ImageCard';

interface CloudImageBrowserProps {
  onInsert: (src: string, alt?: string) => void;
}

interface BreadcrumbEntry {
  id: string;
  name: string;
}

export default function CloudImageBrowser({ onInsert }: CloudImageBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [images, setImages] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setError('');
    try {
      const [allItems, crumbs] = await Promise.all([
        filesApi.list({ folderId: folderId ?? undefined, sortBy: 'name', sortOrder: 'asc' }),
        folderId ? filesApi.breadcrumb(folderId) : Promise.resolve([] as any[]),
      ]);
      if (!mountedRef.current) return;
      setFolders(allItems.filter((f: FileItem) => f.isFolder));
      setImages(allItems.filter((f: FileItem) => !f.isFolder && f.mimeType.startsWith('image/')));
      setBreadcrumbs(crumbs || []);
      setCurrentFolderId(folderId);
    } catch {
      if (mountedRef.current) setError('Failed to load files');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(null);
  }, [fetchContents]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    fetchContents(folderId);
  }, [fetchContents]);

  const navigateBreadcrumb = useCallback((index: number) => {
    if (index === -1) { fetchContents(null); return; }
    const target = breadcrumbs[index];
    if (target) fetchContents(target.id);
  }, [breadcrumbs, fetchContents]);

  const handleInsertImage = useCallback(async (file: FileItem) => {
    if (insertingId) return;
    setInsertingId(file.id);
    try {
      const dataUrl = await fetchImageAsDataUrl(file.id);
      if (mountedRef.current) {
        onInsert(dataUrl, file.originalName || file.name);
      }
    } catch {
      if (mountedRef.current) {
        onInsert(`/api/files/${file.id}/preview`, file.originalName || file.name);
      }
    } finally {
      if (mountedRef.current) setInsertingId(null);
    }
  }, [onInsert, insertingId]);

  if (loading && folders.length === 0 && images.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--editor-active)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-white/40 text-sm mb-3">{error}</p>
        <button
          onMouseDown={(e) => { e.preventDefault(); fetchContents(currentFolderId); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-all"
        >
          <FiRefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      {currentFolderId && (
        <Breadcrumb items={breadcrumbs} onNavigate={navigateBreadcrumb} />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          {images.length} image{images.length !== 1 ? 's' : ''}
          {folders.length > 0 && ` \u00B7 ${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); fetchContents(currentFolderId); }}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          title="Refresh"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
        {folders.length === 0 && images.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FiImage size={28} className="text-white/20" />
            </div>
            <p className="text-white/50 text-sm mb-2">No images found</p>
            <p className="text-white/20 text-xs">Upload images to your files to see them here</p>
          </div>
        )}

        {/* Folders grid */}
        {folders.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2 px-1">
              Folders
            </p>
            <div className="grid grid-cols-3 gap-2">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => navigateToFolder(folder.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Images grid */}
        {images.length > 0 && (
          <div>
            {folders.length > 0 && (
              <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2 px-1">
                Images
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {images.map((file) => (
                <ImageCard
                  key={file.id}
                  file={file}
                  onClick={() => handleInsertImage(file)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator for refresh */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-[var(--editor-active)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
