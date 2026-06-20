import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface NavItemProps {
  icon?: ReactNode;
  label: string;
  path?: string;
  active?: boolean;
  badge?: string | number;
  placeholder?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  depth?: number;
  onClick?: () => void;
}

export default function NavItem({
  icon, label, path, active, badge, placeholder, expanded, onToggle, children, depth = 0, onClick,
}: NavItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (onToggle) { onToggle(); return; }
    if (path) navigate(path);
  };

  const hasExpand = children || onToggle;

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={placeholder}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150
          ${placeholder ? 'opacity-40 cursor-not-allowed' : active ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}
        `}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        title={placeholder ? 'Coming soon' : label}
      >
        {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
        <span className="flex-1 text-left truncate">{label}</span>
        {badge && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
            placeholder ? 'bg-white/5 text-white/30' : 'bg-cyan/10 text-cyan'
          }`}>
            {badge}
          </span>
        )}
        {hasExpand && (
          <span className="shrink-0 text-white/20">
            {expanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          </span>
        )}
      </button>
      {expanded && children && (
        <div className="mt-0.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
