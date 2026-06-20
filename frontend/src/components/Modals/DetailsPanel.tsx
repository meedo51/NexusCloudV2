import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFileText, FiClock, FiCalendar, FiHash, FiLock } from 'react-icons/fi';
import type { NexusDocument } from '../../types';

interface DetailsPanelProps {
  open: boolean;
  document: NexusDocument | null;
  onClose: () => void;
}

export default function DetailsPanel({ open, document: doc, onClose }: DetailsPanelProps) {
  const fmtDate = (s: string) => new Date(s).toLocaleString();

  if (!doc) return null;

  const fields = [
    { icon: FiFileText, label: 'Name', value: doc.name },
    { icon: FiHash, label: 'Words', value: doc.wordCount.toLocaleString() },
    { icon: FiHash, label: 'Characters', value: doc.characterCount.toLocaleString() },
    { icon: FiClock, label: 'Updated', value: fmtDate(doc.updatedAt) },
    { icon: FiCalendar, label: 'Created', value: fmtDate(doc.createdAt) },
    { icon: FiLock, label: 'Version', value: `v${doc.version}` },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 z-[99999] glass-strong border-l border-white/10 overflow-y-auto"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Details</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.label} className="bg-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <f.icon size={12} className="text-cyan/50" />
                    <span className="text-[10px] uppercase tracking-widest text-white/30">{f.label}</span>
                  </div>
                  <p className="text-white/80 text-sm truncate">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
