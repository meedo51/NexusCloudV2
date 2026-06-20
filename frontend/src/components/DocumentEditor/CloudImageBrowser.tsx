import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiFolder, FiRefreshCw, FiChevronRight } from 'react-icons/fi';
import { filesApi } from '../../services/api';
import type { FileItem } from '../../types';

interface CloudImageBrowserProps {
  onInsert: (src: string, alt?: string) => void;
}

export default function CloudImageBrowser({ onInsert }: CloudImageBrowserProps) {
  const [images, setImages] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchImages = async () => {
    setLoading(true);
    setError('');
    try {
      const allImages = await filesApi.list({ type: 'image' });
      setImages(allImages.filter(f => !f.isFolder));
    } catch {
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const getImageUrl = (file: FileItem) => `/api/files/${file.id}/preview`;

  if (loading) {
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
          onMouseDown={(e) => { e.preventDefault(); fetchImages(); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-all"
        >
          <FiRefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <FiImage size={28} className="text-white/20" />
        </div>
        <p className="text-white/50 text-sm mb-2">No images found</p>
        <p className="text-white/20 text-xs">Upload images to your files to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); fetchImages(); }}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          title="Refresh"
        >
          <FiRefreshCw size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
        {images.map((file, i) => (
          <motion.button
            key={file.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onMouseDown={(e) => {
              e.preventDefault();
              onInsert(getImageUrl(file), file.originalName || file.name);
            }}
            className="relative rounded-xl overflow-hidden border border-white/5 hover:border-[var(--editor-active)]/50 transition-all group aspect-[4/3] bg-white/5"
          >
            <img
              src={getImageUrl(file)}
              alt={file.originalName || file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex flex-col items-center justify-end p-2">
              <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2 py-0.5 rounded-lg truncate max-w-full">
                Insert
              </span>
            </div>
            <div className="absolute bottom-1 left-1 right-1">
              <p className="text-[10px] text-white/40 truncate px-1">
                {file.originalName || file.name}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
