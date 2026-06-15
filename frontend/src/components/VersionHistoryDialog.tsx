import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { versionsApi } from '../services/api';
import { FileVersion } from '../types';
import toast from 'react-hot-toast';

interface Props {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistoryDialog({ fileId, fileName, isOpen, onClose }: Props) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    versionsApi.list(fileId).then(data => {
      setVersions(Array.isArray(data) ? data : []);
    }).catch(() => toast.error('Failed to load versions')).finally(() => setLoading(false));
  }, [fileId, isOpen]);

  const restoreVersion = async (versionId: string) => {
    try {
      await versionsApi.restore(fileId, versionId);
      toast.success('Version restored');
      onClose();
    } catch { toast.error('Failed to restore version'); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto m-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Version History: {fileName}</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-white/30">Loading...</div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-white/30">No previous versions</div>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="glass p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Version {v.versionNumber}</p>
                      <p className="text-xs text-white/40">
                        {v.size ? `${(v.size / 1024).toFixed(1)} KB` : '0 B'} · {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => restoreVersion(v.id)}
                      className="px-3 py-1.5 bg-cyan/20 text-cyan rounded-xl text-xs hover:bg-cyan/30 transition">
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
