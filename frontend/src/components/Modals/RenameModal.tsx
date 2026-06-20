import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiX } from 'react-icons/fi';

interface RenameModalProps {
  open: boolean;
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RenameModal({ open, currentName, onConfirm, onCancel, loading }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) onConfirm(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-sm glass-strong rounded-2xl border border-white/10 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
                  <FiEdit2 size={20} className="text-cyan" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Rename</h3>
                  <p className="text-white/40 text-sm">Enter a new name for this document</p>
                </div>
                <button type="button" onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                  <FiX size={18} />
                </button>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan/40 transition-all placeholder:text-white/20 mb-6"
                placeholder="Document name"
                autoFocus
                maxLength={255}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim() || name.trim() === currentName}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/80 hover:to-blue-500/80 transition-all disabled:opacity-40"
                >
                  {loading ? 'Saving...' : 'Rename'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
