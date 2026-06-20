import { type ReactNode } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface NavSectionProps {
  label: string;
  icon?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export default function NavSection({ label, icon, expanded, onToggle, action, children }: NavSectionProps) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-2 group">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
        >
          {icon && <span className="opacity-50">{icon}</span>}
          <span>{label}</span>
          <span className="text-white/10 group-hover:text-white/20 transition-colors">
            {expanded ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
          </span>
        </button>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {expanded && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}
