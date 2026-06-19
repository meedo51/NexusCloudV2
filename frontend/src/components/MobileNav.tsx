import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome, FiShare2, FiMenu, FiX, FiFolder, FiStar, FiTrash2,
  FiFileText, FiUser, FiActivity, FiUpload, FiServer, FiShield,
  FiPlus, FiChevronRight,
} from 'react-icons/fi';
import { filesApi, workspacesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { FileItem, FavoriteEntry, Workspace } from '../types';

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuOpen) {
      filesApi.list({ sortBy: 'name', sortOrder: 'asc' }).then(files => {
        setFolders(files.filter(f => f.isFolder));
      }).catch(() => {});
      filesApi.favorites().then(setFavorites).catch(() => {});
      workspacesApi.list().then(setWorkspaces).catch(() => {});
    }
  }, [menuOpen, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const navTo = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const currentFolderId = location.pathname.startsWith('/folder/')
    ? location.pathname.split('/folder/')[1]
    : null;

  const navItems = [
    { icon: FiHome, label: 'My Files', path: '/', active: location.pathname === '/' || location.pathname.startsWith('/folder/') },
    { icon: FiStar, label: 'Favorites', path: '/favorites', active: location.pathname === '/favorites' },
    { icon: FiTrash2, label: 'Trash', path: '/trash', active: location.pathname === '/trash' },
    { icon: FiShare2, label: 'Shared Links', path: '/shares', active: location.pathname === '/shares' },
    { icon: FiFileText, label: 'Documents', path: '/documents', active: location.pathname === '/documents' },
    { icon: FiUser, label: 'Profile', path: '/profile', active: location.pathname === '/profile' },
  ];

  const toolItems = [
    { icon: FiActivity, label: 'Activity Log', path: '/activity', active: location.pathname === '/activity' },
    { icon: FiUpload, label: 'Upload Requests', path: '/upload-requests', active: location.pathname === '/upload-requests' },
    { icon: FiServer, label: 'Workspaces', path: '/workspaces', active: location.pathname.startsWith('/workspaces') },
    { icon: FiServer, label: 'WebDAV', path: '/webdav', active: location.pathname === '/webdav' },
    { icon: FiShield, label: '2FA Settings', path: '/2fa', active: location.pathname === '/2fa' },
  ];

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-white/5 z-30">
        <div className="flex items-center justify-around py-2 px-4">
          <button
            onMouseDown={(e) => { e.preventDefault(); navTo('/'); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              location.pathname === '/' || location.pathname.startsWith('/folder/') ? 'text-cyan' : 'text-white/40'
            }`}
          >
            <FiHome size={20} />
            <span className="text-[10px]">Files</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); navTo('/shares'); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              location.pathname === '/shares' ? 'text-cyan' : 'text-white/40'
            }`}
          >
            <FiShare2 size={20} />
            <span className="text-[10px]">Shares</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              menuOpen ? 'text-cyan' : 'text-white/40'
            }`}
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            <span className="text-[10px]">Menu</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); navTo('/profile'); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              location.pathname === '/profile' ? 'text-cyan' : 'text-white/40'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan to-coral flex items-center justify-center text-[8px] font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>

      {/* Navigation drawer overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              ref={menuRef}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[80vh] glass-strong rounded-t-3xl border-t border-white/10 overflow-y-auto custom-scrollbar"
            >
              {/* Handle bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 glass-strong z-10">
                <h2 className="text-sm font-semibold text-white/80">Navigation</h2>
                <button
                  onMouseDown={(e) => { e.preventDefault(); setMenuOpen(false); }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-4 space-y-0.5">
                {/* Main nav items */}
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onMouseDown={(e) => { e.preventDefault(); navTo(item.path); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                      item.active ? 'glass text-cyan shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </button>
                ))}

                {/* Tools section */}
                <div className="pt-5 pb-1">
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3">Tools</span>
                </div>
                {toolItems.map((item) => (
                  <button
                    key={item.path}
                    onMouseDown={(e) => { e.preventDefault(); navTo(item.path); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                      item.active ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </button>
                ))}

                {/* Folders */}
                {folders.length > 0 && (
                  <>
                    <div className="pt-5 pb-1">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3">Folders</span>
                    </div>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onMouseDown={(e) => { e.preventDefault(); navTo(`/folder/${folder.id}`); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          currentFolderId === folder.id ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <FiFolder size={16} className="text-cyan/60" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Workspaces */}
                {workspaces.length > 0 && (
                  <>
                    <div className="pt-5 pb-1">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3">Workspaces</span>
                    </div>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onMouseDown={(e) => { e.preventDefault(); navTo(`/workspaces/${ws.id}`); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <FiServer size={14} className="text-cyan/60" />
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Favorites */}
                {favorites.length > 0 && (
                  <>
                    <div className="pt-5 pb-1">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3">Favorites</span>
                    </div>
                    {favorites.map(fav => fav.item && (
                      <button
                        key={fav.id}
                        onMouseDown={(e) => { e.preventDefault(); fav.item!.isFolder ? navTo(`/folder/${fav.item!.id}`) : fav.item!.folderId ? navTo(`/folder/${fav.item!.folderId}`) : navTo('/'); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <FiStar size={14} className="text-yellow/80" />
                        <span className="truncate">{fav.item.originalName}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Bottom spacing for safe area */}
                <div className="h-4" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
