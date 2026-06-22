import { useRef, useEffect, useCallback } from 'react';
import { FiPenTool, FiTrash2 } from 'react-icons/fi';

interface DrawingToolProps {
  enabled: boolean;
  onToggle: () => void;
  onClear: () => void;
  onStartStroke: (x: number, y: number) => void;
  onAddPoint: (x: number, y: number) => void;
  onEndStroke: () => void;
}

export default function DrawingTool({
  enabled, onToggle, onClear,
  onStartStroke, onAddPoint, onEndStroke,
}: DrawingToolProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    const pos = getPos(e);
    onStartStroke(pos.x, pos.y);
  }, [enabled, getPos, onStartStroke]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    const pos = getPos(e);
    onAddPoint(pos.x, pos.y);
  }, [enabled, getPos, onAddPoint]);

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    onEndStroke();
  }, [enabled, onEndStroke]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, [enabled]);

  if (!enabled) {
    return (
      <button
        onClick={onToggle}
        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-violet transition-all"
        title="Enable drawing"
      >
        <FiPenTool size={16} />
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-violet-500/20 rounded-lg px-1.5 py-0.5">
        <span className="text-violet text-xs font-medium">Draw</span>
        <button onClick={onClear} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400" title="Clear page">
          <FiTrash2 size={12} />
        </button>
        <button onClick={onToggle} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 text-xs" title="Disable drawing">
          Off
        </button>
      </div>
      <div
        ref={overlayRef}
        className="absolute inset-0 z-30"
        style={{ cursor: 'crosshair' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </>
  );
}
