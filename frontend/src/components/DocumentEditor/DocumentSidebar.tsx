import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiList, FiInfo, FiDroplet, FiChevronRight, FiChevronDown,
  FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiBold, FiItalic,
} from 'react-icons/fi';
import type { NexusDocument } from '../../types';

interface DocumentSidebarProps {
  editor: Editor | null;
  document: NexusDocument;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'outline' | 'properties' | 'styles';

interface HeadingNode {
  level: number;
  text: string;
  pos: number;
}

export default function DocumentSidebar({ editor, document, isOpen, onClose }: DocumentSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('outline');
  const [headings, setHeadings] = useState<HeadingNode[]>([]);
  const [activeHeadingPos, setActiveHeadingPos] = useState<number | null>(null);

  useEffect(() => {
    if (!editor || activeTab !== 'outline') return;

    const updateHeadings = () => {
      const nodes: HeadingNode[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading') {
          nodes.push({
            level: node.attrs.level,
            text: node.textContent,
            pos,
          });
        }
      });
      setHeadings(nodes);

      // Find nearest heading above cursor
      const { from } = editor.state.selection;
      let nearest: HeadingNode | null = null;
      for (const h of nodes) {
        if (h.pos <= from) nearest = h;
        else break;
      }
      setActiveHeadingPos(nearest?.pos ?? null);
    };

    updateHeadings();
    editor.on('selectionUpdate', updateHeadings);
    editor.on('update', updateHeadings);
    return () => {
      editor.off('selectionUpdate', updateHeadings);
      editor.off('update', updateHeadings);
    };
  }, [editor, activeTab]);

  const scrollToHeading = useCallback((pos: number) => {
    if (!editor) return;
    editor.commands.setTextSelection(pos);
    editor.commands.scrollIntoView();
  }, [editor]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'outline', label: 'Outline', icon: FiList },
    { id: 'properties', label: 'Properties', icon: FiInfo },
    { id: 'styles', label: 'Styles', icon: FiDroplet },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="relative border-l border-white/5 glass-strong overflow-hidden flex-shrink-0"
        >
          <div className="w-[280px] h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-cyan/15 text-cyan'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                    title={tab.label}
                  >
                    <tab.icon size={15} />
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                <FiX size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'outline' && (
                <div className="p-3 space-y-0.5">
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-2 pb-2">
                    Headings
                  </p>
                  {headings.length === 0 ? (
                    <p className="text-xs text-white/20 px-2 py-4 text-center">
                      No headings found
                    </p>
                  ) : (
                    headings.map((h, i) => (
                      <button
                        key={`${h.pos}-${i}`}
                        onClick={() => scrollToHeading(h.pos)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          activeHeadingPos === h.pos
                            ? 'bg-cyan/10 text-cyan border-l-2 border-cyan'
                            : 'text-white/50 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                        style={{ paddingLeft: `${12 + (h.level - 1) * 16}px` }}
                      >
                        <span className="text-[10px] text-white/20 font-mono shrink-0">
                          H{h.level}
                        </span>
                        <span className="truncate">{h.text || 'Untitled'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'properties' && (
                <div className="p-4 space-y-4">
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider">
                    Document Info
                  </p>
                  <PropertyRow label="Name" value={document.name} />
                  <PropertyRow label="Words" value={String(document.wordCount)} />
                  <PropertyRow label="Characters" value={String(document.characterCount)} />
                  <PropertyRow label="Version" value={`v${document.version}`} />
                  <div className="border-t border-white/5 pt-4">
                    <PropertyRow label="Created" value={formatDate(document.createdAt)} />
                    <PropertyRow label="Modified" value={formatDate(document.updatedAt)} />
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <PropertyRow label="ID" value={document.id.slice(0, 8) + '...'} />
                  </div>
                </div>
              )}

              {activeTab === 'styles' && (
                <div className="p-4 space-y-5">
                  {/* Headings */}
                  <div>
                    <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">
                      Headings
                    </p>
                    <div className="space-y-1">
                      {[1, 2, 3, 4].map(level => (
                        <button
                          key={level}
                          onClick={() => editor?.chain().focus().toggleHeading({ level: level as any }).run()}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            editor?.isActive('heading', { level })
                              ? 'bg-cyan/10 text-cyan border-l-2 border-cyan'
                              : 'text-white/50 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                          }`}
                        >
                          <span className="font-mono text-[10px] text-white/20 mr-2">H{level}</span>
                          <span style={{ fontSize: `${1.4 - level * 0.12}em`, fontWeight: level <= 2 ? 700 : 600 }}>
                            Heading {level}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">
                      Text Color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { color: '#E2E8F0', label: 'White' },
                        { color: '#00F0FF', label: 'Cyan' },
                        { color: '#FF6B6B', label: 'Coral' },
                        { color: '#FBBF24', label: 'Yellow' },
                        { color: '#A78BFA', label: 'Purple' },
                        { color: '#34D399', label: 'Green' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => editor?.chain().focus().setColor(c.color).run()}
                          className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all"
                          title={c.label}
                        >
                          <div className="w-6 h-6 rounded-md" style={{ backgroundColor: c.color }} />
                        </button>
                      ))}
                      <button
                        onClick={() => editor?.chain().focus().unsetColor().run()}
                        className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all text-[10px] text-white/40"
                        title="Reset color"
                      >
                        <div className="w-6 h-6 rounded-md bg-transparent border border-dashed border-white/20 flex items-center justify-center">
                          <FiX size={10} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Highlight */}
                  <div>
                    <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">
                      Highlight
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { color: '#FEF08A', label: 'Yellow' },
                        { color: '#86EFAC', label: 'Green' },
                        { color: '#FCA5A5', label: 'Red' },
                        { color: '#93C5FD', label: 'Blue' },
                        { color: '#D8B4FE', label: 'Purple' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => editor?.chain().focus().toggleHighlight({ color: c.color }).run()}
                          className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all"
                          title={c.label}
                        >
                          <div className="w-6 h-6 rounded-md" style={{ backgroundColor: c.color }} />
                        </button>
                      ))}
                      <button
                        onClick={() => editor?.chain().focus().toggleHighlight().run()}
                        className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all text-[10px] text-white/40"
                        title="Remove highlight"
                      >
                        <div className="w-6 h-6 rounded-md bg-transparent border border-dashed border-white/20 flex items-center justify-center">
                          <FiX size={10} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">
                      Alignment
                    </p>
                    <div className="flex gap-1">
                      {[
                        { align: 'left', icon: FiAlignLeft },
                        { align: 'center', icon: FiAlignCenter },
                        { align: 'right', icon: FiAlignRight },
                      ].map(a => (
                        <button
                          key={a.align}
                          onClick={() => editor?.chain().focus().setTextAlign(a.align as any).run()}
                          className={`p-2 rounded-lg text-sm transition-all ${
                            editor?.isActive({ textAlign: a.align })
                              ? 'bg-cyan/15 text-cyan'
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <a.icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-xs text-white/30 shrink-0">{label}</span>
      <span className="text-xs text-white/70 text-right truncate">{value}</span>
    </div>
  );
}
