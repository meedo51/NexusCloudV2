import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiFile, FiFolder, FiImage, FiFileText, FiTrash2 } from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FavoriteEntry } from '../types';
import toast from 'react-hot-toast';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getIcon(mimeType: string | undefined) {
  if (mimeType === 'application/folder') return FiFolder;
  if (mimeType?.startsWith('image/')) return FiImage;
  if (mimeType?.startsWith('text/') || mimeType === 'application/pdf') return FiFileText;
  return FiFile;
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await filesApi.favorites();
      setFavorites(data);
    } catch {
      toast.error('Failed to load favorites');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const handleRemove = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesApi.toggleFavorite(itemId);
      toast.success('Removed from favorites');
      loadFavorites();
    } catch { toast.error('Failed to remove'); }
  };

  const handleClick = (fav: FavoriteEntry) => {
    if (!fav.item) return;
    if (fav.item.isFolder) {
      navigate(`/folder/${fav.item.id}`);
    } else if (fav.item.folderId) {
      navigate(`/folder/${fav.item.folderId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow/10 flex items-center justify-center">
          <FiStar className="text-yellow" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Favorites</h2>
          <p className="text-sm text-white/40">{favorites.length} item(s)</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 shimmer" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
          <FiStar className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">No favorites yet</p>
          <p className="text-sm text-white/30 mt-1">Star files and folders to see them here</p>
        </motion.div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <AnimatePresence>
            {favorites.map((fav, i) => {
              if (!fav.item) return null;
              const Icon = getIcon(fav.item.mimeType);
              return (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => handleClick(fav)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    fav.item.isFolder ? 'bg-cyan/10 text-cyan' : 'bg-white/5 text-white/60'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fav.item.originalName}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {fav.item.isFolder ? 'Folder' : formatSize(fav.item.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemove(fav.itemId, e)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/5 text-coral transition-all"
                    title="Remove from favorites"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
