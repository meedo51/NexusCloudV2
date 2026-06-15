import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiFolder, FiHome, FiShare2, FiChevronRight, FiChevronDown, FiPlus, FiX, FiUser,
  FiTrash2, FiStar, FiActivity, FiUpload, FiShield, FiServer,
} from 'react-icons/fi';
import { filesApi, workspacesApi } from '../services/api';
import { FileItem, FavoriteEntry, Workspace } from '../types';
import toast from 'react-hot-toast';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  const navItems = [
    { icon: FiHome, label: 'My Files', path: '/', active: location.pathname === '/' },
    { icon: FiStar, label: 'Favorites', path: '/favorites', active: location.pathname === '/favorites' },
    { icon: FiTrash2, label: 'Trash', path: '/trash', active: location.pathname === '/trash' },
    { icon: FiShare2, label: 'Shared Links', path: '/shares', active: location.pathname === '/shares' },
    { icon: FiUser, label: 'Profile', path: '/profile', active: location.pathname === '/profile' },
  ];

  return (
    <aside className="h-full glass-strong border-r border-white/5 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h2 className="font-semibold text-white/80">Navigation</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
          <FiX size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              item.active ? 'glass text-cyan shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-4 pb-2">
          <span className="text-xs font-medium text-white/30 uppercase tracking-wider px-3">Tools</span>
        </div>

        <button onClick={() => navigate('/activity')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            location.pathname === '/activity' ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}>
          <FiActivity size={16} />
          <span>Activity Log</span>
        </button>

        <button onClick={() => navigate('/upload-requests')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            location.pathname === '/upload-requests' ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}>
          <FiUpload size={16} />
          <span>Upload Requests</span>
        </button>

        <button onClick={() => navigate('/workspaces')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            location.pathname.startsWith('/workspaces') ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}>
          <FiServer size={16} />
          <span>Workspaces</span>
        </button>

        <button onClick={() => navigate('/webdav')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            location.pathname === '/webdav' ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}>
          <FiServer size={16} />
          <span>WebDAV</span>
        </button>

        <button onClick={() => navigate('/2fa')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            location.pathname === '/2fa' ? 'glass text-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}>
          <FiShield size={16} />
          <span>2FA Settings</span>
        </button>

        <div className="pt-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-white/30 uppercase tracking-wider px-3">Folders</span>
          <button onClick={() => setShowNewFolder(!showNewFolder)} className="p-1 rounded-lg hover:bg-white/5 text-cyan">
            <FiPlus size={14} />
          </button>
        </div>

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
            <FiFolder size={16} className="text-cyan/60" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}

        {folders.length === 0 && !showNewFolder && (
          <p className="text-xs text-white/20 px-3 py-2">No folders yet</p>
        )}

        {workspaces.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <span className="text-xs font-medium text-white/30 uppercase tracking-wider px-3">Workspaces</span>
            </div>
            {workspaces.map(ws => (
              <button key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-white/50 hover:text-white hover:bg-white/5`}>
                <FiServer size={14} className="text-cyan/60" />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </>
        )}

        {favorites.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <span className="text-xs font-medium text-white/30 uppercase tracking-wider px-3">Favorites</span>
            </div>
            {favorites.map(fav => fav.item && (
              <button key={fav.id}
                onClick={() => fav.item!.isFolder ? navigate(`/folder/${fav.item!.id}`) : fav.item!.folderId ? navigate(`/folder/${fav.item!.folderId}`) : navigate('/')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-white/50 hover:text-white hover:bg-white/5`}>
                <FiStar size={14} className="text-yellow/80" />
                <span className="truncate">{fav.item.originalName}</span>
              </button>
            ))}
          </>
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
