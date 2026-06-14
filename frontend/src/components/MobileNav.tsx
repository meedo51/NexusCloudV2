import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiShare2, FiUpload, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const items = [
    { icon: FiHome, label: 'Files', path: '/' },
    { icon: FiShare2, label: 'Shares', path: '/shares' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-white/5 z-30">
      <div className="flex items-center justify-around py-2 px-4">
        {items.map((item) => {
          const active = item.path === '/'
            ? location.pathname === '/' || location.pathname.startsWith('/folder/')
            : location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
                active ? 'text-cyan' : 'text-white/40'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
        <div className="flex flex-col items-center gap-0.5 px-4 py-1 text-white/40">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan to-coral flex items-center justify-center text-[10px] font-bold text-white">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px]">Profile</span>
        </div>
      </div>
    </nav>
  );
}
