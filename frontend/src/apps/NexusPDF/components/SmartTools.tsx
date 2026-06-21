import { useState } from 'react';
import {
  FiEdit, FiBookmark, FiEdit3, FiPenTool,
  FiTrash2, FiCheck, FiX,
} from 'react-icons/fi';

type ToolType = 'highlight' | 'bookmark' | 'note' | 'draw' | null;

interface SmartToolsProps {
  currentPage: number;
  isBookmarked: boolean;
  onAddHighlight: (data: { pageNumber: number; color?: string; text?: string; rects?: any[] }) => void;
  onRemoveHighlight: (id: string) => void;
  onAddBookmark: (data: { pageNumber: number; label?: string }) => void;
  onRemoveBookmark: (id: string) => void;
  onAddNote: (data: { pageNumber: number; content: string }) => void;
  onToggleDraw: (enabled: boolean) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-400', border: 'border-yellow-400' },
  { name: 'green', bg: 'bg-green-400', border: 'border-green-400' },
  { name: 'blue', bg: 'bg-blue-400', border: 'border-blue-400' },
  { name: 'pink', bg: 'bg-pink-400', border: 'border-pink-400' },
  { name: 'purple', bg: 'bg-purple-400', border: 'border-purple-400' },
];

export default function SmartTools({
  currentPage, isBookmarked,
  onAddHighlight, onRemoveHighlight,
  onAddBookmark, onRemoveBookmark,
  onAddNote, onToggleDraw,
}: SmartToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [hlColor, setHlColor] = useState('yellow');
  const [bmLabel, setBmLabel] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [drawEnabled, setDrawEnabled] = useState(false);

  const tools: { type: ToolType; icon: typeof FiEdit; label: string; color: string }[] = [
    { type: 'highlight', icon: FiEdit, label: 'Highlight', color: 'text-yellow-400' },
    { type: 'bookmark', icon: FiBookmark, label: 'Bookmark', color: 'text-cyan' },
    { type: 'note', icon: FiEdit3, label: 'Note', color: 'text-emerald' },
    { type: 'draw', icon: FiPenTool, label: 'Draw', color: 'text-violet' },
  ];

  const handleToolClick = (type: ToolType) => {
    if (activeTool === type) {
      setActiveTool(null);
      if (type === 'draw') { setDrawEnabled(false); onToggleDraw(false); }
      return;
    }
    setActiveTool(type);
    if (type === 'draw') { setDrawEnabled(true); onToggleDraw(true); }
  };

  const handleAddHighlight = () => {
    onAddHighlight({ pageNumber: currentPage, color: hlColor, text: '', rects: [] });
    setActiveTool(null);
  };

  const handleAddBookmark = () => {
    if (isBookmarked) {
      onRemoveBookmark('');
    } else {
      onAddBookmark({ pageNumber: currentPage, label: bmLabel || `Page ${currentPage}` });
    }
    setActiveTool(null);
    setBmLabel('');
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    onAddNote({ pageNumber: currentPage, content: noteContent });
    setNoteContent('');
    setActiveTool(null);
  };

  return (
    <div className="flex items-center gap-1">
      {tools.map(tool => (
        <button
          key={tool.type}
          onClick={() => handleToolClick(tool.type)}
          className={`p-2 rounded-lg transition-all ${
            activeTool === tool.type
              ? 'bg-cyan/20 text-cyan ring-1 ring-cyan/30'
              : 'hover:bg-white/10 text-white/60'
          }`}
          title={tool.label}
        >
          <tool.icon size={16} />
        </button>
      ))}

      {activeTool === 'highlight' && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 glass-strong rounded-xl p-3 border border-white/10 flex items-center gap-2 z-50">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => { setHlColor(c.name); handleAddHighlight(); }}
              className={`w-6 h-6 rounded-full ${c.bg} border-2 ${
                hlColor === c.name ? c.border : 'border-transparent'
              } hover:scale-110 transition-transform`}
            />
          ))}
          <button onClick={() => setActiveTool(null)} className="p-1 hover:bg-white/10 rounded text-white/40">
            <FiX size={14} />
          </button>
        </div>
      )}

      {activeTool === 'bookmark' && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 glass-strong rounded-xl p-3 border border-white/10 flex items-center gap-2 z-50">
          <input
            value={bmLabel}
            onChange={e => setBmLabel(e.target.value)}
            placeholder="Bookmark label..."
            className="bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 w-40 outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAddBookmark()}
          />
          <button onClick={handleAddBookmark} className="p-1.5 bg-cyan/20 rounded-lg text-cyan hover:bg-cyan/30">
            {isBookmarked ? <FiTrash2 size={14} /> : <FiCheck size={14} />}
          </button>
          <button onClick={() => setActiveTool(null)} className="p-1 hover:bg-white/10 rounded text-white/40">
            <FiX size={14} />
          </button>
        </div>
      )}

      {activeTool === 'note' && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 glass-strong rounded-xl p-3 border border-white/10 flex items-center gap-2 z-50">
          <input
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
            placeholder="Write a note..."
            className="bg-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 w-52 outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
          />
          <button onClick={handleAddNote} className="p-1.5 bg-emerald/20 rounded-lg text-emerald hover:bg-emerald/30">
            <FiCheck size={14} />
          </button>
          <button onClick={() => setActiveTool(null)} className="p-1 hover:bg-white/10 rounded text-white/40">
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
