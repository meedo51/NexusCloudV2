import { FiMenu, FiX, FiSearch, FiGrid, FiList } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-strong px-4 md:px-6 py-3 flex items-center justify-between gap-4 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-cyan hidden md:block"
        >
          {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
        <h1 className="text-xl font-bold">
          <span className="text-gradient">NexusCloud</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass text-sm text-white/60">
          <FiSearch size={14} className="text-cyan/60" />
          <span className="text-white/40">Ctrl + K</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-coral flex items-center justify-center text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-white/40">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-3 py-1.5 text-sm rounded-xl glass hover:bg-white/5 transition-colors text-white/60 hover:text-coral"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
