import type { ReactNode, MouseEvent } from 'react';

interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function ToolbarButton({ onClick, active, title, children, disabled, className = '' }: ToolbarButtonProps) {
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onClick) onClick();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      title={title}
      disabled={disabled}
      className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-sm transition-all duration-100 select-none ${
        active
          ? 'bg-[var(--editor-active-bg)] text-[var(--editor-active)] shadow-sm'
          : 'text-[var(--editor-text)] opacity-50 hover:opacity-100 hover:bg-[var(--editor-hover)]'
      } ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer active:scale-95'} ${className}`}
    >
      {children}
    </button>
  );
}
