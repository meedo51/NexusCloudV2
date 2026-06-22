import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus } from 'react-icons/fi';

interface NoteToolProps {
  isAddingNote: boolean;
  noteContent: string;
  onContentChange: (val: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  onOpen: () => void;
}

export default function NoteTool({
  isAddingNote, noteContent,
  onContentChange, onAdd, onCancel, onOpen,
}: NoteToolProps) {
  return (
    <>
      <button
        onClick={onOpen}
        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-emerald transition-all"
        title="Add note"
      >
        <FiPlus size={16} />
      </button>

      <AnimatePresence>
        {isAddingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl border border-white/10 p-5 w-80"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium text-sm">Add Note</h3>
                <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/5 text-white/40">
                  <FiX size={14} />
                </button>
              </div>
              <textarea
                value={noteContent}
                onChange={e => onContentChange(e.target.value)}
                placeholder="Write your note here..."
                className="w-full h-28 rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-emerald/40 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onAdd}
                  className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:opacity-90 transition-all"
                >
                  Add Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
