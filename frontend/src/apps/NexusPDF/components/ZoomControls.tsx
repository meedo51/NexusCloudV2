import { FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
      <button
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="p-1.5 rounded-md hover:bg-white/10 text-white/60 disabled:opacity-30 transition-all"
        title="Zoom out"
      >
        <FiZoomOut size={13} />
      </button>
      <button
        onClick={onReset}
        className="px-2 py-1 rounded-md hover:bg-white/10 text-white/60 text-xs font-medium min-w-[44px] text-center transition-all"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={zoom >= 3}
        className="p-1.5 rounded-md hover:bg-white/10 text-white/60 disabled:opacity-30 transition-all"
        title="Zoom in"
      >
        <FiZoomIn size={13} />
      </button>
      {zoom !== 1 && (
        <button
          onClick={onReset}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/40 transition-all"
          title="Fit page"
        >
          <FiMaximize2 size={12} />
        </button>
      )}
    </div>
  );
}
