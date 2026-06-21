import { FiSun, FiMoon, FiLayers, FiZoomIn, FiZoomOut } from 'react-icons/fi';

interface ReadingPreferencesProps {
  readingMode: 'light' | 'dark' | 'sepia';
  zoom: number;
  fullscreen: boolean;
  onModeChange: (mode: 'light' | 'dark' | 'sepia') => void;
  onZoomChange: (zoom: number) => void;
  onToggleFullscreen: () => void;
}

const modes = [
  { key: 'light' as const, icon: FiSun, label: 'Light' },
  { key: 'dark' as const, icon: FiMoon, label: 'Dark' },
  { key: 'sepia' as const, icon: FiLayers, label: 'Sepia' },
];

export default function ReadingPreferences({
  readingMode, zoom, fullscreen,
  onModeChange, onZoomChange, onToggleFullscreen,
}: ReadingPreferencesProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className={`p-1.5 rounded-md transition-all ${
              readingMode === m.key
                ? 'bg-cyan/20 text-cyan'
                : 'text-white/40 hover:text-white/70'
            }`}
            title={m.label}
          >
            <m.icon size={14} />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-white/5 rounded-lg px-1.5 py-0.5">
        <button
          onClick={() => onZoomChange(Math.max(0.5, +(zoom - 0.25).toFixed(2)))}
          className="p-1 text-white/40 hover:text-white/70"
          title="Zoom out"
        >
          <FiZoomOut size={14} />
        </button>
        <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => onZoomChange(Math.min(3, +(zoom + 0.25).toFixed(2)))}
          className="p-1 text-white/40 hover:text-white/70"
          title="Zoom in"
        >
          <FiZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}
