import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';
import { FileItem } from '../types';
import { filesApi } from '../services/api';

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
      filesApi.preview(file.id).then((res: any) => {
        setTextContent(res.content);
      }).catch(() => {});
    }
  }, [file]);

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="glass-strong rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-medium truncate">{file.originalName}</h3>
            <div className="flex items-center gap-2">
              <a
                href={`/api/files/${file.id}/download`}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
              >
                <FiDownload size={16} />
              </a>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-space/30">
            {isImage ? (
              <img
                src={`/uploads/${file.path.split('uploads/')[1] || file.name}`}
                alt={file.originalName}
                className="max-w-full max-h-[70vh] mx-auto object-contain rounded-xl"
              />
            ) : isPdf ? (
              <iframe
                src={`/api/files/${file.id}/preview`}
                className="w-full h-[70vh] rounded-xl"
                title={file.originalName}
              />
            ) : textContent !== null ? (
              <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap overflow-auto max-h-[65vh]">
                {textContent}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <FiFileText size={48} className="mb-3" />
                <p>Preview not available for this file type</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
