import { useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';

interface StudioAppCardProps {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  status: string;
  color: string;
  path: string;
}

export default function StudioAppCard({ name, icon, description, status, color, path }: StudioAppCardProps) {
  const navigate = useNavigate();

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    beta: 'bg-cyan-500/20 text-cyan-400',
    'coming-soon': 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div
      onClick={() => navigate(path)}
      className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${color} transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
            {icon}
          </div>
          <span className={`px-2 py-1 text-[10px] font-medium rounded-full uppercase tracking-wider ${statusColors[status] || 'bg-white/10 text-white/60'}`}>
            {status}
          </span>
        </div>
        <h3 className="text-lg font-semibold mt-4 text-white/90 group-hover:text-white transition-colors">{name}</h3>
        <p className="text-white/50 text-xs mt-1 group-hover:text-white/80 transition-colors leading-relaxed">{description}</p>
        <button className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/70 group-hover:text-white">
          Launch App &rarr;
        </button>
      </div>
    </div>
  );
}
