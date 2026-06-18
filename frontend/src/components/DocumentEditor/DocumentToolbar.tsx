import type { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import {
  FiBold, FiItalic, FiUnderline, FiCode, FiLink, FiImage,
  FiList, FiCheckSquare, FiMinus, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiChevronDown, FiType, FiHash, FiTable,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

interface DocumentToolbarProps {
  editor: Editor;
}

export default function DocumentToolbar({ editor }: DocumentToolbarProps) {
  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const ToolButton = ({ onClick, active, children, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg text-sm transition-all ${
        active ? 'bg-cyan/20 text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-white/10 mx-1" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-white/5 p-2 flex flex-wrap items-center gap-1"
    >
      {/* Headings */}
      <div className="relative group">
        <button className="p-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-1">
          <FiType size={15} />
          <FiChevronDown size={10} />
        </button>
        <div className="absolute top-full left-0 mt-1 glass-strong rounded-xl border border-white/5 p-2 hidden group-hover:block z-50 min-w-[140px]">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <button
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                editor.isActive('heading', { level }) ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              H{level}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Text formatting */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><FiBold size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><FiItalic size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><FiUnderline size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><FiType size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><FiCode size={15} /></ToolButton>

      <Divider />

      {/* Alignment */}
      <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><FiAlignLeft size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><FiAlignCenter size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><FiAlignRight size={15} /></ToolButton>

      <Divider />

      {/* Lists & blocks */}
      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><FiList size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><FiHash size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><FiCheckSquare size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><FiType size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider"><FiMinus size={15} /></ToolButton>

      <Divider />

      {/* Insert */}
      <ToolButton onClick={addLink} active={editor.isActive('link')} title="Link"><FiLink size={15} /></ToolButton>
      <ToolButton onClick={addImage} active={false} title="Image"><FiImage size={15} /></ToolButton>
      <ToolButton onClick={addTable} active={editor.isActive('table')} title="Table"><FiTable size={15} /></ToolButton>
    </motion.div>
  );
}


