import { useState, useEffect, useRef } from 'react';
import { FiImage, FiAlertCircle } from 'react-icons/fi';
import { fetchImageAsObjectUrl } from '../../utils/imageUtils';
import type { FileItem } from '../../types';

interface ImageCardProps {
  file: FileItem;
  onClick: () => void;
}

export default function ImageCard({ file, onClick }: ImageCardProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchImageAsObjectUrl(file.id).then((url) => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      urlRef.current = url;
      setImgUrl(url);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setLoading(false); setError(true); }
    });

    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [file.id]);

  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-[var(--editor-active)]/50 transition-all bg-white/5 aspect-[4/3]"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]">
          <div className="w-6 h-6 border-2 border-[var(--editor-active)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
          <FiAlertCircle size={20} className="text-red/40" />
        </div>
      )}
      {imgUrl && (
        <img
          src={imgUrl}
          alt={file.originalName || file.name}
          className={`w-full h-full object-cover transition-all duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      {!loading && !error && !imgUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FiImage size={24} className="text-white/20" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-2">
        <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-[10px] bg-black/60 px-2 py-0.5 rounded-lg">
            Insert
          </span>
        </div>
      </div>
      <div className="absolute bottom-1 left-1 right-1">
        <p className="text-[10px] text-white/40 truncate px-1">
          {file.originalName || file.name}
        </p>
      </div>
    </button>
  );
}
