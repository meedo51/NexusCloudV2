import { FiChevronLeft, FiSave, FiRotateCcw, FiRotateCw, FiType, FiMaximize2, FiMinimize2, FiCode } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface EditorToolbarProps {
  fileName: string;
  fileType: string;
  fileTypeBadge: string;
  isDirty: boolean;
  isSaving: boolean;
  fontSize: number;
  wordWrap: boolean;
  isFullscreen: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFontSizeChange: (size: number) => void;
  onWordWrapToggle: () => void;
  onFullscreenToggle: () => void;
  onBack: () => void;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  javascript: 'bg-yellow-500/20 text-yellow-400',
  typescript: 'bg-blue-500/20 text-blue-400',
  html: 'bg-orange-500/20 text-orange-400',
  css: 'bg-purple-500/20 text-purple-400',
  python: 'bg-green-500/20 text-green-400',
  json: 'bg-emerald-500/20 text-emerald-400',
  markdown: 'bg-white/10 text-white/60',
  shell: 'bg-zinc-500/20 text-zinc-400',
  sql: 'bg-sky-500/20 text-sky-400',
  php: 'bg-indigo-500/20 text-indigo-400',
  yaml: 'bg-rose-500/20 text-rose-400',
  xml: 'bg-amber-500/20 text-amber-400',
};

export default function EditorToolbar({
  fileName, fileType, fileTypeBadge, isDirty, isSaving,
  fontSize, wordWrap, isFullscreen,
  onSave, onUndo, onRedo, onFontSizeChange, onWordWrapToggle, onFullscreenToggle, onBack,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 glass rounded-2xl mb-3 flex-shrink-0">
      <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors">
        <FiChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
          <FiCode size={14} className="text-cyan" />
        </div>
        <span className="text-sm font-medium truncate">{fileName}</span>
        {isDirty && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-coral text-xs font-bold">*</motion.span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${FILE_TYPE_COLORS[fileType] || 'bg-white/5 text-white/40'}`}>
          {fileTypeBadge}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onSave} disabled={isSaving}
          className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${isDirty ? 'text-cyan' : 'text-white/40'}`} title="Save (Ctrl+S)">
          <FiSave size={14} />
        </button>
        <button onClick={onUndo} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Undo (Ctrl+Z)">
          <FiRotateCcw size={14} />
        </button>
        <button onClick={onRedo} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Redo (Ctrl+Y)">
          <FiRotateCw size={14} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors text-xs" title="Decrease font size">
          <FiType size={14} className="scale-75" />
        </button>
        <span className="text-xs text-white/30 w-6 text-center">{fontSize}</span>
        <button onClick={() => onFontSizeChange(Math.min(28, fontSize + 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors text-xs" title="Increase font size">
          <FiType size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button onClick={onWordWrapToggle}
          className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${wordWrap ? 'text-cyan' : 'text-white/40'}`} title="Toggle word wrap">
          <span className="text-[10px] font-bold leading-none">W</span>
        </button>
        <button onClick={onFullscreenToggle} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Toggle fullscreen">
          {isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}
