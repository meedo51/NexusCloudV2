import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <button
          onClick={() => navigate('/studio')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold bg-gradient-to-r from-cyan to-blue-400 bg-clip-text text-transparent">
          {title}
        </h1>
      </header>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
