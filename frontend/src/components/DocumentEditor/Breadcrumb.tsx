import { FiChevronRight, FiHome } from 'react-icons/fi';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export default function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs overflow-x-auto custom-scrollbar" aria-label="Breadcrumb">
      <button
        onMouseDown={(e) => { e.preventDefault(); onNavigate(-1); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all shrink-0"
        title="Home"
      >
        <FiHome size={14} />
      </button>
      {items.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1 shrink-0">
          <FiChevronRight size={12} className="text-white/20" />
          <button
            onMouseDown={(e) => { e.preventDefault(); onNavigate(i); }}
            className={`px-2 py-1 rounded-lg transition-all ${
              i === items.length - 1
                ? 'text-white font-medium'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
