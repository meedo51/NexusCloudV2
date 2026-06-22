import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const COLORS = [
  { key: 'yellow', hex: '#FFD700' },
  { key: 'green', hex: '#4ADE80' },
  { key: 'blue', hex: '#60A5FA' },
  { key: 'pink', hex: '#F472B6' },
  { key: 'purple', hex: '#A78BFA' },
];

interface HighlighterToolProps {
  show: boolean;
  x: number;
  y: number;
  selectedText: string;
  highlightColor: string;
  onColorChange: (color: string) => void;
  onApply: (color?: string) => void;
  onClose: () => void;
}

export default function HighlighterTool({
  show, x, y, selectedText, highlightColor,
  onColorChange, onApply, onClose,
}: HighlighterToolProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !toolbarRef.current) return;
    const tb = toolbarRef.current;
    const tr = tb.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let cx = x;
    let cy = y - 8;

    if (cx + tr.width / 2 > vw) cx = vw - tr.width / 2 - 8;
    if (cx - tr.width / 2 < 0) cx = tr.width / 2 + 8;
    if (cy < 8) cy = y + 24;

    tb.style.left = cx + 'px';
    tb.style.top = cy + 'px';
  }, [show, x, y]);

  if (!show || !selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c.key}
              onClick={() => { onColorChange(c.key); }}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                highlightColor === c.key ? 'border-white scale-110' : 'border-transparent'
              } hover:scale-110`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        <button
          onClick={() => onApply()}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-semibold hover:opacity-90"
        >
          Highlight
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40"
        >
          <FiX size={14} />
        </button>
      </div>
    </div>
  );
}
