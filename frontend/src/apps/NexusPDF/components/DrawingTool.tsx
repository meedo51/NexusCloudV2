import { useRef, useEffect, useCallback } from 'react';
import { FiPenTool, FiTrash2 } from 'react-icons/fi';
import { DrawingData } from '../services/pdfApi';

interface DrawingToolProps {
  enabled: boolean;
  color: string;
  brushSize: number;
  drawings: DrawingData[];
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onToggle: () => void;
  onClear: () => void;
  onStrokeComplete: (strokes: { x: number; y: number }[][]) => void;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
}

const COLORS = ['#00F0FF', '#FF6B6B', '#FFD93D', '#4ADE80', '#A78BFA', '#FFFFFF'];

export default function DrawingTool({
  enabled, color, brushSize, drawings, zoom,
  canvasWidth, canvasHeight,
  onToggle, onClear, onStrokeComplete,
  onColorChange, onBrushSizeChange,
}: DrawingToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const allStrokes = useRef<{ x: number; y: number }[][]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  }, [zoom]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allStrokes.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  }, [color, brushSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    allStrokes.current = drawings.flatMap(d => d.strokes);
    redrawAll();
  }, [drawings, redrawAll]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    const ce = 'touches' in e ? e.touches[0] || e.changedTouches[0] : e;
    const pos = getPos(ce.clientX, ce.clientY);
    isDrawing.current = true;
    currentStroke.current = [pos];
  }, [enabled, getPos]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !enabled) return;
    e.preventDefault();
    const ce = 'touches' in e ? e.touches[0] || e.changedTouches[0] : e;
    const pos = getPos(ce.clientX, ce.clientY);
    currentStroke.current.push(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentStroke.current;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }, [enabled, color, brushSize, getPos]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke.current.length >= 2) {
      allStrokes.current.push([...currentStroke.current]);
      onStrokeComplete(allStrokes.current);
    }
    currentStroke.current = [];
  }, [onStrokeComplete]);

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
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-violet transition-all"
        title="Enable drawing"
      >
        <FiPenTool size={13} />
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

      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 p-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                color === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 w-6">{brushSize}px</span>
          <input
            type="range"
            min="1"
            max="12"
            value={brushSize}
            onChange={e => onBrushSizeChange(parseInt(e.target.value))}
            className="w-20 accent-violet-500"
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="absolute inset-0 z-30"
        style={{
          cursor: 'crosshair',
          width: canvasWidth * zoom,
          height: canvasHeight * zoom,
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
        />
      </div>
    </>
  );
}
