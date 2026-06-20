import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiUser, FiShield, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleNav = (path: string) => {
    setDropdownOpen(false);
    navigate(path);
  };

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
          <FiMenu size={14} className="text-cyan/60" />
          <span className="text-white/40">Right-click for menu</span>
        </div>

        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-coral flex items-center justify-center text-xs font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan flex items-center justify-center shadow-sm">
                  <FiShield size={7} className="text-space" />
                </div>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
              <p className="text-xs text-white/40">{user?.email}</p>
            </div>
            <FiChevronDown size={14} className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl border border-white/10 shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-white/5">
                <p className="text-sm font-medium truncate">{user?.displayName || user?.username}</p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-cyan/20 text-cyan text-[10px] font-medium">
                    <FiShield size={9} /> Admin
                  </span>
                )}
              </div>
              <button
                onClick={() => handleNav('/profile')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FiUser size={15} />
                Profile
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNav('/admin')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-cyan hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <FiShield size={15} />
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/50 hover:text-coral hover:bg-white/5 transition-colors border-t border-white/5"
              >
                <FiX size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
