import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome, FiShare2, FiMenu, FiX, FiFolder, FiStar, FiTrash2,
  FiFileText, FiUser, FiActivity, FiUpload, FiServer, FiShield,
  FiGrid, FiDownload, FiChevronDown, FiChevronRight, FiSettings, FiUsers, FiSliders,
} from 'react-icons/fi';
import { filesApi, workspacesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { FileItem, FavoriteEntry, Workspace } from '../types';

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    home: true, tools: false, folders: false, admin: false,
  });
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
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  const navTo = (path: string, state?: any) => {
    setMenuOpen(false);
    navigate(path, { state });
  };

  const isActive = (path: string) => location.pathname === path;

  const currentFolderId = location.pathname.startsWith('/folder/')
    ? location.pathname.split('/folder/')[1]
    : null;

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-white/5 z-30">
        <div className="flex items-center justify-around py-2 px-4">
          <button
            onClick={() => navTo('/')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              location.pathname === '/' || location.pathname.startsWith('/folder/') ? 'text-cyan' : 'text-white/40'
            }`}
          >
            <FiHome size={20} />
            <span className="text-[10px]">Files</span>
          </button>
          <button
            onClick={() => navTo('/studio')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              isActive('/studio') ? 'text-cyan' : 'text-white/40'
            }`}
          >
            <FiGrid size={20} />
            <span className="text-[10px]">Studio</span>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              menuOpen ? 'text-cyan' : 'text-white/40'
            }`}
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            <span className="text-[10px]">Menu</span>
          </button>
          <button
            onClick={() => navTo('/profile')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              isActive('/profile') ? 'text-cyan' : 'text-white/40'
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
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 glass-strong z-10">
                <h2 className="text-sm font-semibold text-white/80">Navigation</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-4 space-y-0.5">
                {/* Home section */}
                <div className="mb-1">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, home: !prev.home }))}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors w-full text-left"
                  >
                    Home
                    <span className="text-white/10">
                      {expanded.home ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                    </span>
                  </button>
                  {expanded.home && (
                    <div className="space-y-0.5">
                      <button onClick={() => navTo('/')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          isActive('/') || location.pathname.startsWith('/folder/') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        <FiHome size={16} />
                        <span>My Space</span>
                      </button>
                      <button onClick={() => navTo('/favorites')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          isActive('/favorites') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        <FiStar size={16} />
                        <span>Favorites</span>
                      </button>
                      <div className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm opacity-40 cursor-not-allowed text-white/60">
                        <FiDownload size={16} className="text-white/30" />
                        <span className="flex-1">Downloads</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-white/20">Soon</span>
                      </div>
                      <button onClick={() => navTo('/studio')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          isActive('/studio') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        <FiGrid size={16} />
                        <span>Studio</span>
                      </button>
                      <button onClick={() => navTo('/trash')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          isActive('/trash') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        <FiTrash2 size={16} />
                        <span>Trash</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tools section */}
                <div className="mb-1">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, tools: !prev.tools }))}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors w-full text-left"
                  >
                    Tools
                    <span className="text-white/10">
                      {expanded.tools ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                    </span>
                  </button>
                  {expanded.tools && (
                    <div className="space-y-0.5">
                      <button onClick={() => navTo('/shares')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                          isActive('/shares') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}>
                        <FiShare2 size={16} />
                        <span>Shared Links</span>
                      </button>
                      {[
                        { icon: FiActivity, label: 'Activity Log', path: '/activity' },
                        { icon: FiUpload, label: 'Upload Requests', path: '/upload-requests' },
                        { icon: FiServer, label: 'Workspaces', path: '/workspaces' },
                        { icon: FiServer, label: 'WebDAV', path: '/webdav' },
                        { icon: FiShield, label: '2FA Settings', path: '/2fa' },
                      ].map(item => (
                        <button key={item.path} onClick={() => navTo(item.path)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            (item.path === '/workspaces' ? location.pathname.startsWith('/workspaces') : isActive(item.path)) ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <item.icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Administration section */}
                {isAdmin && (
                  <div className="mb-1">
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, admin: !prev.admin }))}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors w-full text-left"
                    >
                      Administration
                      <span className="text-white/10">
                        {expanded.admin ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                      </span>
                    </button>
                    {expanded.admin && (
                      <div className="space-y-0.5">
                        <button onClick={() => navTo('/admin')}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            isActive('/admin') ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiShield size={16} />
                          <span>Dashboard</span>
                        </button>
                        <button onClick={() => navTo('/admin', { tab: 'users' })}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            location.pathname === '/admin' && location.state?.tab === 'users' ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiUsers size={16} />
                          <span>Users</span>
                        </button>
                        <button onClick={() => navTo('/admin', { tab: 'filetypes' })}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            location.pathname === '/admin' && location.state?.tab === 'filetypes' ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiSliders size={16} />
                          <span>File Types</span>
                        </button>
                        <button onClick={() => navTo('/admin', { tab: 'settings' })}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            location.pathname === '/admin' && location.state?.tab === 'settings' ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiSettings size={16} />
                          <span>Settings</span>
                        </button>
                        <button onClick={() => navTo('/admin', { tab: 'security' })}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            location.pathname === '/admin' && location.state?.tab === 'security' ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiActivity size={16} />
                          <span>Audit Logs</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Folders section */}
                <div className="mb-1">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, folders: !prev.folders }))}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors w-full text-left"
                  >
                    <FiFolder size={10} className="opacity-50" />
                    Folders
                    <span className="text-white/10">
                      {expanded.folders ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                    </span>
                  </button>
                  {expanded.folders && (
                    <div className="space-y-0.5">
                      {folders.map((folder) => (
                        <button key={folder.id} onClick={() => navTo(`/folder/${folder.id}`)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${
                            currentFolderId === folder.id ? 'glass text-cyan' : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}>
                          <FiFolder size={16} className="text-cyan/60" />
                          <span className="truncate">{folder.name}</span>
                        </button>
                      ))}
                      {folders.length === 0 && (
                        <p className="text-xs text-white/20 px-3 py-2">No folders yet</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Workspaces */}
                {workspaces.length > 0 && (
                  <div className="pt-2">
                    <div className="px-3 py-2">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Workspaces</span>
                    </div>
                    {workspaces.map(ws => (
                      <button key={ws.id} onClick={() => navTo(`/workspaces/${ws.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-white/60 hover:text-white hover:bg-white/5">
                        <FiServer size={14} className="text-cyan/60" />
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Favorites */}
                {favorites.length > 0 && (
                  <div className="pt-2">
                    <div className="px-3 py-2">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Favorites</span>
                    </div>
                    {favorites.map(fav => fav.item && (
                      <button key={fav.id}
                        onClick={() => fav.item!.isFolder ? navTo(`/folder/${fav.item!.id}`) : fav.item!.folderId ? navTo(`/folder/${fav.item!.folderId}`) : navTo('/')}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-white/60 hover:text-white hover:bg-white/5">
                        <FiStar size={14} className="text-yellow/80" />
                        <span className="truncate">{fav.item.originalName}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="h-4" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
