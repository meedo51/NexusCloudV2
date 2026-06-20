import { FiClock } from 'react-icons/fi';

interface NavPlaceholderProps {
  label: string;
  icon?: React.ReactNode;
}

export default function NavPlaceholder({ label, icon }: NavPlaceholderProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl opacity-40 cursor-not-allowed select-none"
      title="Coming soon"
      style={{ paddingLeft: '36px' }}>
      {icon || <FiClock size={14} className="text-white/30" />}
      <span className="text-sm text-white/40 flex-1 truncate">{label}</span>
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-white/20 shrink-0">
        Soon
      </span>
    </div>
  );
}
