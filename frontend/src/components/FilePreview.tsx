import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiFileText, FiZoomIn, FiZoomOut, FiRotateCw, FiMaximize2 } from 'react-icons/fi';
import { FileItem } from '../types';
import { filesApi } from '../services/api';

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
}

type PreviewMode = 'image' | 'pdf' | 'text' | 'unsupported';

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType.startsWith('text/') || file.mimeType === 'application/json';

  const previewMode: PreviewMode = isImage ? 'image' : isPdf ? 'pdf' : isText ? 'text' : 'unsupported';

  useEffect(() => {
    if (isText) {
      filesApi.preview(file.id).then((res: any) => {
        setTextContent(res.content);
      }).catch(() => {});
    }
    if (isPdf) {
      filesApi.download(file.id).then((blob: Blob) => {
        setPdfUrl(URL.createObjectURL(blob));
      }).catch(() => {});
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file, isText, isPdf]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '=' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setZoom(z => Math.min(z + 25, 300)); }
      if (e.key === '-' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setZoom(z => Math.max(z - 25, 25)); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const blob = await filesApi.download(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const imageUrl = `/uploads/${file.path.split('uploads/')[1] || file.name}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={`${isFullscreen ? 'inset-0 fixed' : 'relative max-w-5xl max-h-[90vh]'} glass-strong rounded-2xl overflow-hidden flex flex-col`}
          style={isFullscreen ? { position: 'fixed', inset: 0, borderRadius: 0 } : {}}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-sm font-medium truncate">{file.originalName}</h3>
              {previewMode === 'image' && (
                <div className="hidden sm:flex items-center gap-1 ml-2">
                  <button onClick={() => setZoom(z => Math.max(z - 25, 25))} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors">
                    <FiZoomOut size={14} />
                  </button>
                  <span className="text-xs text-white/40 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(z + 25, 300))} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors">
                    <FiZoomIn size={14} />
                  </button>
                  <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors">
                    <FiRotateCw size={14} />
                  </button>
                  <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors">
                    <FiMaximize2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={`/api/files/${file.id}/download`}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
                onClick={handleDownload}
              >
                <FiDownload size={16} />
              </a>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-space/50 flex items-center justify-center p-2">
            {previewMode === 'image' ? (
              <div className="flex items-center justify-center w-full h-full p-4" style={{ minHeight: '300px' }}>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt={file.originalName}
                  className="max-w-full max-h-[70vh] object-contain transition-all duration-200 rounded-lg"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    cursor: zoom > 100 ? 'grab' : 'default',
                  }}
                  draggable={false}
                />
              </div>
            ) : previewMode === 'pdf' ? (
              <iframe
                src={pdfUrl || ''}
                className="w-full h-[75vh] rounded-xl"
                title={file.originalName}
              />
            ) : previewMode === 'text' && textContent !== null ? (
              <div className="w-full max-h-[70vh] overflow-auto">
                <div className="glass rounded-xl p-5">
                  <pre className="text-sm text-white/80 font-mono whitespace-pre-wrap leading-relaxed">
                    {textContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-white/40 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <FiFileText size={32} className="text-white/20" />
                </div>
                <p className="text-sm">Preview not available for this file type</p>
                <button
                  onClick={handleDownload}
                  className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold flex items-center gap-2 hover:opacity-90"
                >
                  <FiDownload size={14} />
                  Download instead
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-xs text-white/30 flex-shrink-0">
            <span className="truncate">{file.mimeType}</span>
            <span className="hidden sm:inline">{new Intl.NumberFormat().format(file.size)} bytes</span>
            <span className="hidden sm:inline">{previewMode === 'image' ? `${zoom}%` : previewMode === 'pdf' ? 'PDF' : previewMode === 'text' ? 'Text' : ''}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
