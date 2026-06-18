import type { Editor } from '@tiptap/react';

interface FloatingToolbarProps {
  editor: Editor;
}

export default function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="glass-strong rounded-xl border border-white/10 p-1.5 flex items-center gap-1 shadow-2xl">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-lg text-sm ${editor.isActive('bold') ? 'bg-cyan/20 text-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-lg text-sm ${editor.isActive('italic') ? 'bg-cyan/20 text-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded-lg text-sm ${editor.isActive('underline') ? 'bg-cyan/20 text-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        <u>U</u>
      </button>
      <div className="w-px h-5 bg-white/10 mx-0.5" />
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded-lg text-sm ${editor.isActive('code') ? 'bg-cyan/20 text-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        {'</>'}
      </button>
      <button
        onClick={addLink}
        className={`p-1.5 rounded-lg text-sm ${editor.isActive('link') ? 'bg-cyan/20 text-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        🔗
      </button>
    </div>
  );
}
