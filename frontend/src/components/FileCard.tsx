import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiFile, FiFolder, FiImage, FiFileText, FiDownload,
  FiTrash2, FiEdit2, FiShare2, FiInfo, FiMove, FiEye,
  FiArchive, FiChevronRight,
} from 'react-icons/fi';
import { FileItem } from '../types';
import { filesApi } from '../services/api';
import toast from 'react-hot-toast';
import ContextMenu, { MenuItem } from './ContextMenu';
import ShareDialog from './ShareDialog';
import FilePreview from './FilePreview';
import MoveDialog from './MoveDialog';
import DetailsDialog from './DetailsDialog';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/folder') return FiFolder;
  if (mimeType.startsWith('image/')) return FiImage;
  if (mimeType.startsWith('text/') || mimeType === 'application/pdf') return FiFileText;
  return FiFile;
}

interface FileCardProps {
  file: FileItem;
  viewMode: 'grid' | 'list';
  onRefresh: () => void;
  onClick: () => void;
}

export default function FileCard({ file, viewMode, onRefresh, onClick }: FileCardProps) {
  const [showShare, setShowShare] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.originalName || file.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType.startsWith('image/');
  const isPreviewable = file.mimeType.startsWith('image/') ||
    file.mimeType === 'application/pdf' ||
    file.mimeType.startsWith('text/');

  const handleRename = async () => {
    if (!newName.trim() || newName === (file.originalName || file.name)) {
      setIsRenaming(false);
      return;
    }
    try {
      await filesApi.rename(file.id, newName.trim());
      toast.success('Renamed');
      setIsRenaming(false);
      onRefresh();
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await filesApi.delete(file.id);
      toast.success('Deleted');
      onRefresh();
    } catch {
      toast.error('Failed to delete');
    }
    setIsDeleting(false);
  };

  const handleDownload = async () => {
    try {
      const blob = await filesApi.download(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDownloadZip = async () => {
    try {
      const blob = await filesApi.downloadZip(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Folder downloaded as zip');
    } catch {
      toast.error('Failed to create zip');
    }
  };

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const menuItems: MenuItem[] = file.isFolder
    ? [
        { id: 'rename', label: 'Rename', icon: <FiEdit2 size={14} />, shortcut: 'F2', onClick: () => { setNewName(file.originalName || file.name); setIsRenaming(true); } },
        { id: 'download-zip', label: 'Download as ZIP', icon: <FiArchive size={14} />, onClick: handleDownloadZip },
        { id: 'move', label: 'Move to...', icon: <FiMove size={14} />, onClick: () => setShowMove(true) },
        { id: 'divider-1', label: '', icon: <></>, divider: true, onClick: () => {} },
        { id: 'details', label: 'Details', icon: <FiInfo size={14} />, onClick: () => setShowDetails(true) },
        { id: 'divider-2', label: '', icon: <></>, divider: true, onClick: () => {} },
        { id: 'delete', label: 'Delete', icon: <FiTrash2 size={14} />, danger: true, onClick: handleDelete },
      ]
    : [
        { id: 'preview', label: 'Preview', icon: <FiEye size={14} />, shortcut: 'Space', onClick: () => setShowPreview(true) },
        { id: 'download', label: 'Download', icon: <FiDownload size={14} />, onClick: handleDownload },
        { id: 'rename', label: 'Rename', icon: <FiEdit2 size={14} />, shortcut: 'F2', onClick: () => { setNewName(file.originalName || file.name); setIsRenaming(true); } },
        { id: 'move', label: 'Move to...', icon: <FiMove size={14} />, onClick: () => setShowMove(true) },
        { id: 'share', label: 'Share', icon: <FiShare2 size={14} />, onClick: () => setShowShare(true) },
        { id: 'divider-1', label: '', icon: <></>, divider: true, onClick: () => {} },
        { id: 'details', label: 'Details', icon: <FiInfo size={14} />, onClick: () => setShowDetails(true) },
        { id: 'divider-2', label: '', icon: <></>, divider: true, onClick: () => {} },
        { id: 'delete', label: 'Delete', icon: <FiTrash2 size={14} />, danger: true, onClick: handleDelete },
      ];

  const handleClick = () => {
    if (file.isFolder) onClick();
  };

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl px-4 py-3 flex items-center gap-4 group cursor-pointer select-none"
          onClick={handleClick}
          onContextMenu={onContextMenu}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${file.isFolder ? 'bg-cyan/10 text-cyan' : isImage ? 'bg-coral/10 text-coral' : 'bg-white/5 text-white/60'}`}>
            {isImage && file.path ? (
              <img src={`/uploads/${file.path.split('uploads/')[1] || file.name}`} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Icon size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="bg-white/5 rounded px-2 py-1 text-sm w-full outline-none border border-cyan/30"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <p className="text-sm font-medium truncate">{file.originalName || file.name}</p>
            )}
            <p className="text-xs text-white/40 mt-0.5">
              {file.isFolder ? 'Folder' : formatSize(file.size)} &middot; {formatDate(file.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {file.isFolder ? (
              <button onClick={handleDownloadZip} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Download as ZIP">
                <FiArchive size={16} />
              </button>
            ) : (
              <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Download">
                <FiDownload size={16} />
              </button>
            )}
            {!file.isFolder && (
              <button onClick={() => setShowShare(true)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Share">
                <FiShare2 size={16} />
              </button>
            )}
            <button onClick={() => { setShowMove(true); }} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Move">
              <FiMove size={16} />
            </button>
            <button onClick={() => { setIsRenaming(true); setNewName(file.originalName || file.name); }} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Rename">
              <FiEdit2 size={16} />
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-coral transition-colors" title="Delete">
              <FiTrash2 size={16} />
            </button>
          </div>
        </motion.div>
        {showShare && <ShareDialog fileId={file.id} fileName={file.originalName || file.name} onClose={() => setShowShare(false)} />}
        {showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}
        {showMove && <MoveDialog fileId={file.id} fileName={file.originalName || file.name} currentFolderId={file.folderId} onClose={() => setShowMove(false)} onMoved={onRefresh} />}
        {showDetails && <DetailsDialog fileId={file.id} onClose={() => setShowDetails(false)} />}
        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={menuItems} onClose={() => setContextMenu(null)} />}
      </>
    );
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4 }}
        className="glass-card rounded-2xl overflow-hidden group cursor-pointer select-none"
        onClick={handleClick}
        onContextMenu={onContextMenu}
      >
        <div className={`relative aspect-[4/3] flex items-center justify-center
          ${file.isFolder ? 'bg-cyan/5' : isImage ? 'bg-space' : 'bg-white/5'}`}>
          {isImage && file.path ? (
            <img src={`/uploads/${file.path.split('uploads/')[1] || file.name}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon size={48} className={file.isFolder ? 'text-cyan/60' : 'text-white/30'} />
          )}

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {file.isFolder ? (
              <button onClick={handleDownloadZip} className="p-2 rounded-lg bg-space/80 hover:bg-space text-cyan/80 hover:text-cyan transition-colors" title="Download as ZIP">
                <FiArchive size={14} />
              </button>
            ) : (
              <button onClick={handleDownload} className="p-2 rounded-lg bg-space/80 hover:bg-space text-cyan/80 hover:text-cyan transition-colors" title="Download">
                <FiDownload size={14} />
              </button>
            )}
            <button onClick={() => setShowShare(true)} className="p-2 rounded-lg bg-space/80 hover:bg-space text-cyan/80 hover:text-cyan transition-colors" title="Share">
              <FiShare2 size={14} />
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-lg bg-space/80 hover:bg-space text-coral/80 hover:text-coral transition-colors" title="Delete">
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>

        <div className="p-3">
          {isRenaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              className="bg-white/5 rounded px-2 py-1 text-sm w-full outline-none border border-cyan/30"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <p className="text-sm font-medium truncate" onDoubleClick={() => { setIsRenaming(true); setNewName(file.originalName || file.name); }}>
              {file.originalName || file.name}
            </p>
          )}
          <p className="text-xs text-white/40 mt-1">
            {file.isFolder ? 'Folder' : formatSize(file.size)}
          </p>
          <p className="text-xs text-white/30">{formatDate(file.createdAt)}</p>
        </div>
      </motion.div>
      {showShare && <ShareDialog fileId={file.id} fileName={file.originalName || file.name} onClose={() => setShowShare(false)} />}
      {showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}
      {showMove && <MoveDialog fileId={file.id} fileName={file.originalName || file.name} currentFolderId={file.folderId} onClose={() => setShowMove(false)} onMoved={onRefresh} />}
      {showDetails && <DetailsDialog fileId={file.id} onClose={() => setShowDetails(false)} />}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={menuItems} onClose={() => setContextMenu(null)} />}
    </>
  );
}
