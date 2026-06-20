import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiHome, FiShare2, FiChevronRight, FiChevronDown, FiPlus, FiX, FiUser,
  FiTrash2, FiStar, FiActivity, FiUpload, FiShield, FiServer, FiFileText,
  FiGrid, FiDownload, FiFolder, FiSettings, FiUsers,
} from 'react-icons/fi';
import { filesApi, workspacesApi } from '../services/api';
import { FileItem, FavoriteEntry, Workspace } from '../types';
import toast from 'react-hot-toast';
import FolderIcon from './Icons/FolderIcon';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    home: true, tools: false, folders: false, admin: false,
  });
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    filesApi.list({ sortBy: 'name', sortOrder: 'asc' }).then(files => {
      setFolders(files.filter(f => f.isFolder));
    }).catch(() => {});
    filesApi.favorites().then(setFavorites).catch(() => {});
    workspacesApi.list().then(setWorkspaces).catch(() => {});
  }, [location.pathname]);

  const currentFolderId = location.pathname.startsWith('/folder/')
    ? location.pathname.split('/folder/')[1]
    : null;

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await filesApi.createFolder(newFolderName.trim());
      toast.success('Folder created');
      setNewFolderName('');
      setShowNewFolder(false);
      const files = await filesApi.list({ sortBy: 'name', sortOrder: 'asc' });
      setFolders(files.filter(f => f.isFolder));
    } catch { toast.error('Failed to create folder'); }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="h-full glass-strong border-r border-white/5 flex flex-col">
      <div className="p-4 flex items-center gap-2 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan to-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0">
          N
        </div>
        <span className="font-semibold text-sm bg-gradient-to-r from-cyan to-blue-400 bg-clip-text text-transparent flex-1">
          NexusCloud
        </span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
          <FiX size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
        {/* Home Section */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-3 py-2 group">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, home: !prev.home }))}
              className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
            >
              <span>Home</span>
              <span className="text-white/10 group-hover:text-white/20 transition-colors">
                {expanded.home ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
              </span>
            </button>
          </div>
          {expanded.home && (
            <div className="space-y-0.5">
              <button onClick={() => navigate('/')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/') || location.pathname.startsWith('/folder/') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <FiHome size={16} />
                <span>My Space</span>
              </button>
              <button onClick={() => navigate('/favorites')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/favorites') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <FiStar size={16} />
                <span>Favorites</span>
              </button>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm opacity-40 cursor-not-allowed text-white/50" title="Coming soon">
                <FiDownload size={16} className="text-white/30" />
                <span className="flex-1">Downloads</span>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-white/20">Soon</span>
              </div>
              <button onClick={() => navigate('/studio')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/studio') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <FiGrid size={16} />
                <span>Studio</span>
              </button>
              <button onClick={() => navigate('/trash')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/trash') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <FiTrash2 size={16} />
                <span>Trash</span>
              </button>
            </div>
          )}
        </div>

        {/* Tools Section */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-3 py-2 group">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, tools: !prev.tools }))}
              className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
            >
              <span>Tools</span>
              <span className="text-white/10 group-hover:text-white/20 transition-colors">
                {expanded.tools ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
              </span>
            </button>
          </div>
          {expanded.tools && (
            <div className="space-y-0.5">
              <button onClick={() => navigate('/shares')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/shares') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <FiShare2 size={16} />
                <span>Shared Links</span>
              </button>
              {[
                { icon: FiActivity, label: 'Activity Log', path: '/activity' },
                { icon: FiUpload, label: 'Upload Requests', path: '/upload-requests' },
                { icon: FiServer, label: 'Workspaces', path: '/workspaces', startsWith: true },
                { icon: FiServer, label: 'WebDAV', path: '/webdav' },
                { icon: FiShield, label: '2FA Settings', path: '/2fa' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    (item.startsWith ? location.pathname.startsWith(item.path) : isActive(item.path)) ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Administration Section */}
        {isAdmin && (
          <div className="mb-1">
            <div className="flex items-center justify-between px-3 py-2 group">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, admin: !prev.admin }))}
                className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
              >
                <span>Administration</span>
                <span className="text-white/10 group-hover:text-white/20 transition-colors">
                  {expanded.admin ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                </span>
              </button>
            </div>
            {expanded.admin && (
              <div className="space-y-0.5">
                <button onClick={() => navigate('/admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive('/admin') ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <FiShield size={16} />
                  <span>Dashboard</span>
                </button>
                <button onClick={() => navigate('/admin?tab=users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    location.pathname === '/admin' && new URLSearchParams(location.search).get('tab') === 'users' ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <FiUsers size={16} />
                  <span>Users</span>
                </button>
                <button onClick={() => navigate('/admin?tab=settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    location.pathname === '/admin' && new URLSearchParams(location.search).get('tab') === 'settings' ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <FiSettings size={16} />
                  <span>Settings</span>
                </button>
                <button onClick={() => navigate('/admin?tab=audit')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    location.pathname === '/admin' && new URLSearchParams(location.search).get('tab') === 'audit' ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <FiActivity size={16} />
                  <span>Audit Logs</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Folders Section */}
        <div className="mb-1">
          <div className="flex items-center justify-between px-3 py-2 group">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, folders: !prev.folders }))}
              className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
            >
              <FiFolder size={10} className="opacity-50" />
              <span>Folders</span>
              <span className="text-white/10 group-hover:text-white/20 transition-colors">
                {expanded.folders ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
              </span>
            </button>
            <button onClick={() => setShowNewFolder(!showNewFolder)} className="p-1 rounded-lg hover:bg-white/5 text-cyan">
              <FiPlus size={14} />
            </button>
          </div>
          {expanded.folders && (
            <div className="space-y-0.5">
              {showNewFolder && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-3 pb-2">
                  <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createFolder()} placeholder="Folder name..."
                    className="w-full px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30 transition-colors" />
                </motion.div>
              )}
              {folders.map((folder) => (
                <button key={folder.id} onClick={() => navigate(`/folder/${folder.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                    currentFolderId === folder.id ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}>
                  <FolderIcon size="sm" color="default" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
              {folders.length === 0 && !showNewFolder && (
                <p className="text-xs text-white/20 px-3 py-2">No folders yet</p>
              )}
            </div>
          )}
        </div>

        {/* Workspaces */}
        {workspaces.length > 0 && (
          <div className="pt-1">
            <div className="px-3 py-2">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Workspaces</span>
            </div>
            {workspaces.map(ws => (
              <button key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-white/50 hover:text-white hover:bg-white/5`}>
                <FiServer size={14} className="text-cyan/60" />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Favorites inline */}
        {favorites.length > 0 && (
          <div className="pt-1">
            <div className="px-3 py-2">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Favorites</span>
            </div>
            {favorites.map(fav => fav.item && (
              <button key={fav.id}
                onClick={() => fav.item!.isFolder ? navigate(`/folder/${fav.item!.id}`) : fav.item!.folderId ? navigate(`/folder/${fav.item!.folderId}`) : navigate('/')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-white/50 hover:text-white hover:bg-white/5`}>
                <FiStar size={14} className="text-yellow/80" />
                <span className="truncate">{fav.item.originalName}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-white/30">NexusCloud v2.0</p>
        </div>
      </div>
    </aside>
  );
}
