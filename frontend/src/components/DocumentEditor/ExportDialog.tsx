import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiDownload, FiX, FiFile, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface ExportDialogProps {
  onExport: (format: string) => Promise<void>;
  onClose: () => void;
}

export default function ExportDialog({ onExport, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formats = [
    { id: 'html', name: 'HTML', desc: 'Full HTML document', icon: FiFileText },
    { id: 'markdown', name: 'Markdown', desc: '.md format with formatting preserved', icon: FiFile },
    { id: 'txt', name: 'Plain Text', desc: 'Stripped formatting, text only', icon: FiFile },
    { id: 'pdf', name: 'PDF', desc: 'Portable Document Format', icon: FiFile },
  ];

  const handleExport = async (format: string) => {
    if (exporting) return;
    setExporting(format);
    setError(null);
    setSuccess(null);
    try {
      await onExport(format);
      setSuccess(format);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err?.message || 'Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-strong rounded-2xl border border-white/10 p-6 w-80"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <FiDownload size={16} className="text-cyan" />
            Export Document
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <FiX size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg px-3 py-2 text-xs">
            <FiAlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="space-y-2">
          {formats.map(format => {
            const isExporting = exporting === format.id;
            const isSuccess = success === format.id;
            return (
              <button
                key={format.id}
                onClick={() => handleExport(format.id)}
                disabled={!!exporting}
                className={`w-full glass rounded-xl p-3 text-left transition-all border group ${
                  isSuccess
                    ? 'border-green-500/30 bg-green-500/10'
                    : isExporting
                      ? 'border-cyan/30 bg-cyan/10'
                      : 'border-white/5 hover:border-cyan/30'
                } disabled:opacity-70`}
              >
                <div className="flex items-center gap-3">
                  {isSuccess ? (
                    <FiCheck size={18} className="text-green-400" />
                  ) : isExporting ? (
                    <div className="w-[18px] h-[18px] border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <format.icon size={18} className="text-cyan/60 group-hover:text-cyan transition-colors" />
                  )}
                  <div className="flex-1">
                    <p className="text-white text-sm">{format.name}</p>
                    <p className="text-white/30 text-xs">{format.desc}</p>
                  </div>
                  {isExporting && <span className="text-cyan text-xs">Exporting...</span>}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
