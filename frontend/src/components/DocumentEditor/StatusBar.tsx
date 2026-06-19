import type { Editor } from '@tiptap/react';
import { motion } from 'framer-motion';
import { FiType, FiAlignLeft, FiClock, FiSave } from 'react-icons/fi';

interface StatusBarProps {
  editor: Editor | null;
  version?: number;
  whitePage?: boolean;
}

export default function StatusBar({ editor, version, whitePage }: StatusBarProps) {
  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words?.() || 0;
  const charCount = editor.storage.characterCount?.characters?.() || 0;
  const isDark = !whitePage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-0 left-0 right-0 px-4 py-1.5 flex items-center justify-between text-xs border-t ${
        isDark
          ? 'glass-strong border-white/5 text-white/40'
          : 'bg-gray-100 border-gray-200 text-gray-500'
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <FiType size={12} />
          {wordCount} words
        </span>
        <span className="flex items-center gap-1.5">
          <FiAlignLeft size={12} />
          {charCount} characters
        </span>
        <span className="flex items-center gap-1.5">
          <FiClock size={12} />
          Auto-save enabled
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={isDark ? 'text-white/30' : 'text-gray-400'}>v{version || 1}</span>
      </div>
    </motion.div>
  );
}
