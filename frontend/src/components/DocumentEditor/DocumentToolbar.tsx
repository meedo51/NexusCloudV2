import type { Editor } from '@tiptap/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import {
  FiBold, FiItalic, FiUnderline, FiCode, FiLink, FiImage,
  FiList, FiCheckSquare, FiMinus, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiChevronDown, FiType, FiHash, FiTable, FiSun, FiMoon,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

interface DocumentToolbarProps {
  editor: Editor;
  onToggleWhitePage?: () => void;
  isWhitePage?: boolean;
}

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px', '60px', '72px'];
const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Comic Sans MS, cursive',
  'Impact, sans-serif',
  'Palatino Linotype, serif',
];

function cleanFontName(family: string): string {
  return family.split(',')[0].replace(/['"]/g, '').trim();
}

export default function DocumentToolbar({ editor, onToggleWhitePage, isWhitePage }: DocumentToolbarProps) {
  const [showHeading, setShowHeading] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setShowHeading(false);
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) setShowFontFamily(false);
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) setShowFontSize(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const setFontFamily = useCallback((family: string) => {
    editor.chain().focus().setFontFamily(family).run();
    setShowFontFamily(false);
  }, [editor]);

  const setFontSize = useCallback((size: string) => {
    editor.chain().focus().setFontSize(size).run();
    setShowFontSize(false);
  }, [editor]);

  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Inter, sans-serif';
  const currentSize = editor.getAttributes('textStyle').fontSize || '16px';
  const headingLevel = [1, 2, 3, 4, 5, 6].find(l => editor.isActive('heading', { level: l })) || null;

  const ToolButton = ({ onClick, active, children, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg text-sm transition-all whitespace-nowrap ${
        active ? 'bg-cyan/20 text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-white/5 p-2 flex flex-wrap items-center gap-1 overflow-x-auto"
    >
      {/* Headings */}
      <div className="relative" ref={headingRef}>
        <button
          onClick={() => { setShowHeading(!showHeading); setShowFontFamily(false); setShowFontSize(false); }}
          className="p-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-1"
          title="Heading"
        >
          <FiType size={15} />
          <span className="text-xs min-w-[20px]">{headingLevel ? `H${headingLevel}` : 'H'}</span>
          <FiChevronDown size={10} />
        </button>
        {showHeading && (
          <div className="absolute top-full left-0 mt-1 glass-strong rounded-xl border border-white/5 p-2 z-50 min-w-[140px] shadow-2xl">
            <button
              onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeading(false); }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${!headingLevel ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              Paragraph
            </button>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button
                key={level}
                onClick={() => { editor.chain().focus().toggleHeading({ level: level as any }).run(); setShowHeading(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                  editor.isActive('heading', { level }) ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Heading {level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Family */}
      <div className="relative" ref={fontFamilyRef}>
        <button
          onClick={() => { setShowFontFamily(!showFontFamily); setShowHeading(false); setShowFontSize(false); }}
          className="p-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-1"
          title="Font Family"
        >
          <span className="text-xs max-w-[60px] truncate">{cleanFontName(currentFont)}</span>
          <FiChevronDown size={10} />
        </button>
        {showFontFamily && (
          <div className="absolute top-full left-0 mt-1 glass-strong rounded-xl border border-white/5 p-2 z-50 min-w-[180px] shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
            {FONT_FAMILIES.map(family => (
              <button
                key={family}
                onClick={() => setFontFamily(family)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                  currentFont === family ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                style={{ fontFamily: family }}
              >
                {cleanFontName(family)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size */}
      <div className="relative" ref={fontSizeRef}>
        <button
          onClick={() => { setShowFontSize(!showFontSize); setShowHeading(false); setShowFontFamily(false); }}
          className="p-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-1"
          title="Font Size"
        >
          <span className="text-xs min-w-[28px]">{currentSize}</span>
          <FiChevronDown size={10} />
        </button>
        {showFontSize && (
          <div className="absolute top-full left-0 mt-1 glass-strong rounded-xl border border-white/5 p-2 z-50 min-w-[100px] shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
            {FONT_SIZES.map(size => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                  currentSize === size ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Text formatting */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><FiBold size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><FiItalic size={15} /></ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><FiUnderline size={15} /></ToolButton>
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

      <Divider />

      {/* White page toggle */}
      {onToggleWhitePage && (
        <ToolButton onClick={onToggleWhitePage} active={!!isWhitePage} title={isWhitePage ? 'Dark mode' : 'Light mode'}>
          {isWhitePage ? <FiMoon size={15} /> : <FiSun size={15} />}
        </ToolButton>
      )}
    </motion.div>
  );
}
