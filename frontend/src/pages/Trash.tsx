import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiTrash2, FiClock, FiRotateCcw, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import toast from 'react-hot-toast';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function Trash() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const data = await filesApi.trash();
      setFiles(data);
    } catch {
      toast.error('Failed to load trash');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTrash(); }, [loadTrash]);

  const handleRestore = async (id: string) => {
    try {
      await filesApi.restore(id);
      toast.success('File restored');
      loadTrash();
    } catch { toast.error('Failed to restore'); }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this item? This cannot be undone.')) return;
    try {
      await filesApi.deletePermanent(id);
      toast.success('Permanently deleted');
      loadTrash();
    } catch { toast.error('Failed to delete'); }
  };

  const handleRestoreAll = async () => {
    setIsProcessing(true);
    try {
      await filesApi.batchRestore();
      toast.success('All items restored');
      loadTrash();
    } catch { toast.error('Failed to restore all'); }
    setIsProcessing(false);
  };

  const handlePurgeAll = async () => {
    if (!window.confirm('Empty the entire trash? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await filesApi.purgeTrash();
      toast.success('Trash emptied');
      loadTrash();
    } catch { toast.error('Failed to empty trash'); }
    setIsProcessing(false);
  };

  const handlePurgeOld = async () => {
    setIsProcessing(true);
    try {
      await filesApi.purgeOldTrash();
      toast.success('Old items purged');
      loadTrash();
    } catch { toast.error('Failed to purge'); }
    setIsProcessing(false);
  };

  const filtered = files.filter(f =>
    !search || f.originalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
            <FiTrash2 className="text-coral" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Trash</h2>
            <p className="text-sm text-white/40">{files.length} item(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <>
              <button onClick={handleRestoreAll} disabled={isProcessing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/5 text-cyan text-xs">
                <FiRotateCcw size={14} /> Restore All
              </button>
              <button onClick={handlePurgeOld} disabled={isProcessing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/5 text-white/60 hover:text-white text-xs">
                <FiClock size={14} /> Purge 30d+
              </button>
              <button onClick={handlePurgeAll} disabled={isProcessing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/5 text-coral text-xs">
                <FiAlertTriangle size={14} /> Empty All
              </button>
            </>
          )}
          <button onClick={loadTrash} className="p-2 rounded-xl glass hover:bg-white/5 text-cyan">
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trash..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
          <FiTrash2 className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">Trash is empty</p>
          <p className="text-sm text-white/30 mt-1">Deleted files will appear here</p>
        </motion.div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <AnimatePresence>
            {filtered.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  file.isFolder ? 'bg-cyan/10 text-cyan' : 'bg-white/5 text-white/60'
                }`}>
                  {file.isFolder ? <FiClock size={18} /> : <FiTrash2 size={16} className="text-coral/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <p className="text-xs text-white/40">
                    {file.isFolder ? 'Folder' : formatSize(file.size)} &middot; Deleted {file.deletedAt ? formatDate(file.deletedAt) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestore(file.id)}
                    className="p-2 rounded-lg hover:bg-white/5 text-cyan hover:text-cyan transition-colors"
                    title="Restore"
                  >
                    <FiRotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(file.id)}
                    className="p-2 rounded-lg hover:bg-white/5 text-coral hover:text-coral transition-colors"
                    title="Delete permanently"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
