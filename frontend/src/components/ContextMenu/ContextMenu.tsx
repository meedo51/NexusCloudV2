import { useState, useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  color?: string;
  disabled?: boolean;
  divider?: boolean;
  hidden?: boolean;
  action?: () => void;
  subItems?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const visibleItems = items.filter(i => !i.hidden);
  const enabledIndices = visibleItems
    .map((item, idx) => (item.divider || item.disabled ? -1 : idx))
    .filter(i => i !== -1);

  const validPosition = position
    ? {
        x: Math.min(position.x, window.innerWidth - 240),
        y: Math.min(position.y, window.innerHeight - visibleItems.length * 44 - 32),
      }
    : null;

  useEffect(() => {
    if (!position) return;
    setFocusIndex(0);
  }, [position]);

  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escapeHandler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', escapeHandler);
    }, 0);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }, [position, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(prev => {
        const idx = enabledIndices.indexOf(prev);
        return enabledIndices[(idx + 1) % enabledIndices.length];
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(prev => {
        const idx = enabledIndices.indexOf(prev);
        return enabledIndices[(idx - 1 + enabledIndices.length) % enabledIndices.length];
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = visibleItems[focusIndex];
      if (item && !item.disabled && !item.divider) {
        item.action?.();
        if (!item.subItems) onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [visibleItems, focusIndex, enabledIndices, onClose]);

  useEffect(() => {
    if (focusIndex >= 0 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>('[data-menu-item]');
      buttons[focusIndex]?.focus();
    }
  }, [focusIndex]);

  if (!position) return null;

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-[99999] min-w-[220px] max-w-[300px] py-1.5 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl"
      style={{
        left: validPosition?.x ?? position.x,
        top: validPosition?.y ?? position.y,
      }}
    >
      {visibleItems.map((item, idx) => {
        if (item.divider) {
          return <div key={item.id || idx} role="separator" className="my-1 mx-2 border-t border-white/10" />;
        }
        return (
          <button
            key={item.id || idx}
            data-menu-item
            role="menuitem"
            disabled={item.disabled}
            tabIndex={idx === focusIndex ? 0 : -1}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => {
              if (!item.disabled && !item.divider) {
                item.action?.();
                if (!item.subItems) onClose();
              }
            }}
            onMouseEnter={() => { setFocusIndex(idx); setActiveSubmenu(item.subItems ? item.id : null); }}
            className={`
              w-full px-3 py-2.5 flex items-center gap-3 text-sm transition-all duration-100
              ${idx === focusIndex ? 'bg-white/10' : 'hover:bg-white/5'}
              ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              ${item.color || 'text-white/80'}
            `}
          >
            {item.icon && <span className="w-4 h-4 shrink-0 opacity-60">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-white/30 font-mono">{item.shortcut}</span>
            )}
            {item.subItems && (
              <svg className="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        );
      })}
      {activeSubmenu && (
        <SubMenu
          parentItem={visibleItems.find(i => i.id === activeSubmenu)!}
          onAction={onClose}
        />
      )}
    </div>
  );

  return createPortal(<AnimatePresence>
    {position && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12 }}
      >
        {menuContent}
      </motion.div>
    )}
  </AnimatePresence>, document.body);
}

function SubMenu({ parentItem, onAction }: { parentItem: ContextMenuItem; onAction: () => void }) {
  if (!parentItem.subItems) return null;
  return (
    <div className="ml-6 border-l border-white/10 pl-1">
      {parentItem.subItems.map((sub, idx) => (
        <button
          key={sub.id || idx}
          role="menuitem"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => { sub.action?.(); onAction(); }}
          className={`
            w-full px-3 py-1.5 flex items-center gap-3 text-sm transition-all
            hover:bg-white/5 text-white/60 hover:text-white
            ${sub.color || ''}
          `}
        >
          <span className="w-4 shrink-0" />
          <span className="flex-1 text-left">{sub.label}</span>
        </button>
      ))}
    </div>
  );
}
