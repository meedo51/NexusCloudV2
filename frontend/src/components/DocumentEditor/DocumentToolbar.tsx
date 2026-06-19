import type { Editor } from '@tiptap/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import {
  FiBold, FiItalic, FiUnderline, FiCode, FiLink, FiImage,
  FiList, FiCheckSquare, FiMinus, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiChevronDown, FiType, FiHash, FiTable, FiSun, FiMoon, FiMenu, FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ToolbarButton from './ToolbarButton';

interface DocumentToolbarProps {
  editor: Editor;
  onToggleWhitePage?: () => void;
  isWhitePage?: boolean;
  onOpenImageModal?: () => void;
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

export default function DocumentToolbar({ editor, onToggleWhitePage, isWhitePage, onOpenImageModal }: DocumentToolbarProps) {
  const [showHeading, setShowHeading] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setShowHeading(false);
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) setShowFontFamily(false);
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) setShowFontSize(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setShowMobile(false);
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

  const Divider = () => <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />;

  const toolGroups = (
    <>
      <div className="relative" ref={headingRef}>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowHeading(!showHeading); setShowFontFamily(false); setShowFontSize(false); }}
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
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setParagraph().run(); setShowHeading(false); }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${!headingLevel ? 'text-cyan bg-cyan/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              Paragraph
            </button>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button
                key={level}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: level as any }).run(); setShowHeading(false); }}
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

      <div className="relative" ref={fontFamilyRef}>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontFamily(!showFontFamily); setShowHeading(false); setShowFontSize(false); }}
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
                onMouseDown={(e) => { e.preventDefault(); setFontFamily(family); }}
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

      <div className="relative" ref={fontSizeRef}>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontSize(!showFontSize); setShowHeading(false); setShowFontFamily(false); }}
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
                onMouseDown={(e) => { e.preventDefault(); setFontSize(size); }}
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

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><FiBold size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><FiItalic size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><FiUnderline size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><FiType size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><FiCode size={15} /></ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><FiAlignLeft size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><FiAlignCenter size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><FiAlignRight size={15} /></ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><FiList size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><FiHash size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><FiCheckSquare size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><FiType size={15} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider"><FiMinus size={15} /></ToolbarButton>

      <Divider />

      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link"><FiLink size={15} /></ToolbarButton>
      <ToolbarButton onClick={onOpenImageModal} active={false} title="Image"><FiImage size={15} /></ToolbarButton>
      <ToolbarButton onClick={addTable} active={editor.isActive('table')} title="Table"><FiTable size={15} /></ToolbarButton>

      <Divider />

      {onToggleWhitePage && (
        <ToolbarButton onClick={onToggleWhitePage} active={!!isWhitePage} title={isWhitePage ? 'Dark mode' : 'Light mode'}>
          {isWhitePage ? <FiMoon size={15} /> : <FiSun size={15} />}
        </ToolbarButton>
      )}
    </>
  );

  return (
    <div className="relative" ref={mobileRef}>
      {/* Mobile toggle button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); setShowMobile(!showMobile); }}
        className="md:hidden glass rounded-2xl border border-white/5 p-2 flex items-center gap-2 text-white/60 hover:text-white hover:bg-white/5 transition-all w-full"
      >
        <FiMenu size={16} />
        <span className="text-xs">Formatting tools</span>
        <div className="ml-auto flex items-center gap-1.5 text-white/30">
          {headingLevel && <span className="text-xs">H{headingLevel}</span>}
          <span className="text-xs">{cleanFontName(currentFont)}, {currentSize}</span>
        </div>
      </button>

      {/* Desktop toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:flex glass rounded-2xl border border-white/5 p-2 flex-wrap items-center gap-1"
      >
        {toolGroups}
      </motion.div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {showMobile && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="md:hidden absolute top-full left-0 right-0 mt-2 glass-strong rounded-2xl border border-white/10 p-3 z-[9999] shadow-2xl max-h-[60vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex flex-wrap items-center gap-1">
              {toolGroups}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
