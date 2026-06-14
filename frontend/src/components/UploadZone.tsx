import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiFile, FiX, FiCheck, FiHardDrive } from 'react-icons/fi';
import { filesApi } from '../services/api';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  folderId?: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadZone({ folderId, onUploadComplete }: UploadZoneProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const totalSize = accepted.reduce((sum, f) => sum + f.size, 0);
    try {
      const quota = await filesApi.getQuota();
      if (totalSize > quota.remaining) {
        setQuotaExceeded(true);
        toast.error(`Storage quota would be exceeded. Need ${(totalSize / 1024 / 1024).toFixed(1)}MB but only ${(quota.remaining / 1024 / 1024).toFixed(1)}MB remaining`);
        return;
      }
    } catch {
      // proceed anyway if quota check fails
    }
    setQuotaExceeded(false);

    const newUploads = accepted.map(f => ({ file: f, progress: 0, status: 'pending' as const }));
    setUploads(prev => [...prev, ...newUploads]);

    const startIdx = uploads.length;
    newUploads.forEach((upload, idx) => {
      const actualIdx = startIdx + idx;
      setUploads(prev => prev.map((u, i) => i === actualIdx ? { ...u, status: 'uploading' } : u));

      filesApi.upload(upload.file, folderId, (pct) => {
        setUploads(prev => prev.map((u, i) => i === actualIdx ? { ...u, progress: pct } : u));
      })
        .then(() => {
          setUploads(prev => prev.map((u, i) => i === actualIdx ? { ...u, status: 'done', progress: 100 } : u));
          onUploadComplete();
        })
        .catch((err) => {
          setUploads(prev => prev.map((u, i) =>
            i === actualIdx ? { ...u, status: 'error', error: err.response?.data?.error || err.message } : u
          ));
          toast.error(`Failed to upload ${upload.file.name}: ${err.response?.data?.error || err.message}`);
        });
    });
  }, [folderId, onUploadComplete, uploads.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
  });

  const clearUploads = () => setUploads([]);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${quotaExceeded ? 'border-coral bg-coral/5' :
            isDragActive || isDragOver
            ? 'border-cyan bg-cyan/5 neon-glow'
            : 'border-white/10 hover:border-cyan/30 hover:bg-white/5'
          }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <motion.div
            animate={{ y: isDragActive ? -8 : 0, scale: isDragActive ? 1.1 : 1 }}
            className="w-14 h-14 rounded-2xl bg-cyan/10 flex items-center justify-center mb-3"
          >
            <FiUpload size={24} className="text-cyan" />
          </motion.div>
          <p className="text-lg font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-white/40 mt-1">or click to browse</p>
        </div>
      </div>

      {quotaExceeded && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-coral/10 text-coral text-sm">
          <FiHardDrive size={16} />
          <span>Storage quota exceeded. Free up space or upload fewer files.</span>
        </div>
      )}

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">{uploads.length} file(s)</span>
              <button onClick={clearUploads} className="text-xs text-white/40 hover:text-coral">
                Clear
              </button>
            </div>
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  u.status === 'done' ? 'bg-green-500/20 text-green-400' :
                  u.status === 'error' ? 'bg-coral/20 text-coral' :
                  'bg-cyan/10 text-cyan'
                }`}>
                  {u.status === 'done' ? <FiCheck size={16} /> :
                   u.status === 'error' ? <FiX size={16} /> :
                   <FiFile size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{u.file.name}</p>
                  <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${u.progress}%` }}
                      className={`h-full rounded-full ${
                        u.status === 'error' ? 'bg-coral' :
                        u.status === 'done' ? 'bg-green-400' :
                        'bg-cyan'
                      }`}
                    />
                  </div>
                </div>
                <span className="text-xs text-white/40 w-10 text-right">
                  {u.status === 'done' ? '100%' : `${u.progress}%`}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
