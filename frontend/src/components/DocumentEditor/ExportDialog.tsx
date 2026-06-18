import { motion } from 'framer-motion';
import { FiFileText, FiDownload, FiX, FiFile } from 'react-icons/fi';

interface ExportDialogProps {
  onExport: (format: string) => void;
  onClose: () => void;
}

export default function ExportDialog({ onExport, onClose }: ExportDialogProps) {
  const formats = [
    { id: 'html', name: 'HTML', desc: 'Full HTML document', icon: FiFileText },
    { id: 'markdown', name: 'Markdown', desc: '.md format', icon: FiFile },
    { id: 'txt', name: 'Plain Text', desc: 'Stripped formatting', icon: FiFile },
    { id: 'pdf', name: 'PDF', desc: 'Portable Document Format', icon: FiFile },
  ];

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
        <div className="space-y-2">
          {formats.map(format => (
            <button
              key={format.id}
              onClick={() => onExport(format.id)}
              className="w-full glass rounded-xl p-3 text-left hover:border-cyan/30 transition-all border border-white/5 group"
            >
              <div className="flex items-center gap-3">
                <format.icon size={18} className="text-cyan/60 group-hover:text-cyan transition-colors" />
                <div>
                  <p className="text-white text-sm">{format.name}</p>
                  <p className="text-white/30 text-xs">{format.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
