import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  divider?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - items.length * 44 - 16);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{ left: menuX, top: menuY }}
        className="fixed z-[60] min-w-[200px] py-1.5 rounded-2xl glass-strong border border-white/5 shadow-2xl shadow-black/50 overflow-hidden"
      >
        {items.map((item, i) => (
          <div key={item.id}>
            {item.divider && i > 0 && (
              <div className="mx-2 my-1 h-px bg-white/5" />
            )}
            <button
              onClick={() => { item.onClick(); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all hover:bg-white/5 ${
                item.danger ? 'text-coral hover:text-coral' : 'text-white/80 hover:text-white'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] text-white/20 font-mono">{item.shortcut}</span>
              )}
            </button>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
