import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  open, title, message, itemName, onConfirm, onCancel, loading,
}: DeleteConfirmModalProps) {
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
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <FiAlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{title}</h3>
                  <p className="text-white/40 text-sm">{message}</p>
                </div>
                <button onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                  <FiX size={18} />
                </button>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 mb-6">
                <p className="text-white/80 text-sm truncate">{itemName}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
