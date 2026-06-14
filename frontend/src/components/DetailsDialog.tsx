import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiFile, FiFolder, FiCalendar, FiClock, FiHardDrive,
  FiType, FiTag, FiHash, FiLayers, FiHome,
} from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface DetailsDialogProps {
  fileId: string;
  onClose: () => void;
  rootMode?: boolean;
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl glass">
      <span className="text-cyan/60 w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="text-xs text-white/40 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-white/80 truncate">{value}</span>
    </div>
  );
}

export default function DetailsDialog({ fileId, onClose, rootMode }: DetailsDialogProps) {
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(!rootMode);

  useEffect(() => {
    if (fileId && !rootMode) {
      filesApi.details(fileId).then(setFile).catch(() => {}).finally(() => setLoading(false));
    }
  }, [fileId, rootMode]);

  const title = rootMode ? 'My Files' : 'Details';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass-strong rounded-2xl p-6 w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <FiX size={18} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded-xl shimmer" />
              ))}
            </div>
          ) : file ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                  file.isFolder ? 'bg-cyan/10 text-cyan' : 'bg-coral/10 text-coral'
                }`}>
                  {file.isFolder ? <FiFolder size={22} /> : <FiFile size={22} />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.originalName || file.name}</p>
                  <p className="text-xs text-white/40">{file.isFolder ? 'Folder' : file.mimeType}</p>
                </div>
              </div>

              <DetailRow icon={<FiTag size={14} />} label="Name" value={file.originalName || file.name} />
              <DetailRow icon={<FiType size={14} />} label="Type" value={file.isFolder ? 'Folder' : file.mimeType} />
              {!file.isFolder && (
                <DetailRow icon={<FiHardDrive size={14} />} label="Size" value={formatSize(file.size)} />
              )}
              {file.isFolder && (
                <DetailRow icon={<FiLayers size={14} />} label="Items" value={`${(file as any).itemCount || 0} items`} />
              )}
              <DetailRow icon={<FiCalendar size={14} />} label="Created" value={formatDate(file.createdAt)} />
              <DetailRow icon={<FiClock size={14} />} label="Modified" value={formatDate(file.updatedAt)} />
              <DetailRow icon={<FiHash size={14} />} label="ID" value={file.id.slice(0, 8)} />
            </div>
          ) : rootMode ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-cyan/10 flex items-center justify-center">
                  <FiHome size={22} className="text-cyan" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">My Files</p>
                  <p className="text-xs text-white/40">Root directory</p>
                </div>
              </div>
              <DetailRow icon={<FiTag size={14} />} label="Name" value="My Files" />
              <DetailRow icon={<FiType size={14} />} label="Type" value="Root folder" />
            </div>
          ) : (
            <p className="text-white/40 text-center py-8">Failed to load details</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
