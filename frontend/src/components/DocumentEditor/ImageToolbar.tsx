import type { Editor } from '@tiptap/react';
import {
  FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiRotateCcw, FiTrash2,
} from 'react-icons/fi';

interface ImageToolbarProps {
  editor: Editor;
}

const RESIZE_PRESETS = [
  { label: 'S', width: '200px' },
  { label: 'M', width: '400px' },
  { label: 'L', width: '600px' },
  { label: 'XL', width: '100%' },
];

export default function ImageToolbar({ editor }: ImageToolbarProps) {
  const currentAttrs = editor.getAttributes('image');

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    editor.chain().focus().updateAttributes('image', { alignment }).run();
  };

  const setWidth = (width: string) => {
    editor.chain().focus().updateAttributes('image', { width }).run();
  };

  const deleteImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <div className="glass-strong rounded-xl border border-white/10 p-1.5 shadow-2xl whitespace-nowrap flex items-center gap-0.5">
      <button
        onMouseDown={(e) => { e.preventDefault(); setAlignment('left'); }}
        className={`p-1.5 rounded-lg text-sm transition-all ${
          currentAttrs.alignment === 'left'
            ? 'bg-[var(--editor-active-bg)] text-[var(--editor-active)]'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
        title="Align left"
      >
        <FiAlignLeft size={14} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); setAlignment('center'); }}
        className={`p-1.5 rounded-lg text-sm transition-all ${
          !currentAttrs.alignment || currentAttrs.alignment === 'center'
            ? 'bg-[var(--editor-active-bg)] text-[var(--editor-active)]'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
        title="Align center"
      >
        <FiAlignCenter size={14} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); setAlignment('right'); }}
        className={`p-1.5 rounded-lg text-sm transition-all ${
          currentAttrs.alignment === 'right'
            ? 'bg-[var(--editor-active-bg)] text-[var(--editor-active)]'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
        title="Align right"
      >
        <FiAlignRight size={14} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {RESIZE_PRESETS.map(p => (
        <button
          key={p.label}
          onMouseDown={(e) => { e.preventDefault(); setWidth(p.width); }}
          className={`px-2 py-1 rounded-lg text-xs transition-all ${
            currentAttrs.width === p.width
              ? 'bg-[var(--editor-active-bg)] text-[var(--editor-active)]'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
          title={`${p.label} (${p.width})`}
        >
          {p.label}
        </button>
      ))}

      <div className="w-px h-5 bg-white/10 mx-1" />

      <button
        onMouseDown={(e) => { e.preventDefault(); deleteImage(); }}
        className="p-1.5 rounded-lg text-sm text-red/50 hover:text-red hover:bg-red/10 transition-all"
        title="Delete image"
      >
        <FiTrash2 size={14} />
      </button>
    </div>
  );
}
