import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiList, FiSearch, FiArrowLeft, FiFolderPlus, FiFilter,
  FiFilePlus, FiUpload, FiInfo, FiCheckSquare, FiSquare,
  FiArchive, FiTrash2, FiMove, FiX, FiCopy, FiClipboard,
} from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import FileCard from '../components/FileCard';
import UploadZone from '../components/UploadZone';
import ContextMenu, { MenuItem } from '../components/ContextMenu';
import DetailsDialog from '../components/DetailsDialog';
import MoveDialog from '../components/MoveDialog';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFileEditor, setShowNewFileEditor] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showFolderDetails, setShowFolderDetails] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchZipName, setBatchZipName] = useState('');
  const [showBatchZip, setShowBatchZip] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchMove, setShowBatchMove] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selRect, setSelRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const copiedIds = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const selStart = useRef<{ x: number; y: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (folderId) params.folderId = folderId;
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const data = await filesApi.list(params);
      setFiles(data);
    } catch {
      toast.error('Failed to load files');
    }
    setLoading(false);
  }, [folderId, search, typeFilter]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [folderId]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await filesApi.createFolder(newFolderName.trim(), folderId);
      toast.success('Folder created');
      setNewFolderName('');
      setShowNewFolderInput(false);
      loadFiles();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await filesApi.createFile(newFileName.trim(), newFileContent, folderId);
      toast.success('File created');
      setNewFileName('');
      setNewFileContent('');
      setShowNewFileInput(false);
      loadFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create file');
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isFolder) {
      navigate(`/folder/${file.id}`);
    }
  };

  const handleSelect = (id: string, ctrl?: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getGridItemRects = useCallback((): { id: string; rect: DOMRect }[] => {
    const container = containerRef.current;
    if (!container) return [];
    const items = container.querySelectorAll('[data-file-id]');
    return Array.from(items).map(el => ({
      id: el.getAttribute('data-file-id') || '',
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBatchZip = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const name = batchZipName.trim() || 'batch-export';
      const blob = await filesApi.batchZip(Array.from(selectedIds), name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Zip downloaded');
      setShowBatchZip(false);
      setBatchZipName('');
    } catch {
      toast.error('Failed to create zip');
    }
    setIsProcessing(false);
  };

  const handleBatchSaveZip = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const name = batchZipName.trim() || 'batch-export';
      await filesApi.batchSaveZip(Array.from(selectedIds), name, folderId);
      toast.success('Zip saved to current folder');
      setShowBatchZip(false);
      setBatchZipName('');
      loadFiles();
    } catch {
      toast.error('Failed to save zip');
    }
    setIsProcessing(false);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      await filesApi.batchDelete(Array.from(selectedIds));
      toast.success('Items deleted');
      setShowBatchDeleteConfirm(false);
      clearSelection();
      loadFiles();
    } catch {
      toast.error('Failed to delete');
    }
    setIsProcessing(false);
  };

  const handleBatchMoved = () => {
    clearSelection();
    loadFiles();
  };

  const handleContextMenuAction = (action: string) => {
    switch (action) {
      case 'details':
        setShowFolderDetails(true);
        break;
      case 'new-folder':
        setShowNewFolderInput(true);
        setShowNewFileInput(false);
        setShowUpload(false);
        break;
      case 'new-file':
        setShowNewFileInput(true);
        setShowNewFolderInput(false);
        setShowUpload(false);
        break;
      case 'upload':
        setShowUpload(true);
        setShowNewFolderInput(false);
        setShowNewFileInput(false);
        break;
    }
  };

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (selectionMode) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [selectionMode]);

  const emptyMenuItems: MenuItem[] = [
    { id: 'details', label: 'Folder Details', icon: <FiInfo size={14} />, onClick: () => setShowFolderDetails(true) },
    { id: 'divider-1', label: '', icon: <></>, divider: true, onClick: () => {} },
    { id: 'new-folder', label: 'Create New Folder', icon: <FiFolderPlus size={14} />, onClick: () => handleContextMenuAction('new-folder') },
    { id: 'new-file', label: 'Create New File', icon: <FiFilePlus size={14} />, onClick: () => handleContextMenuAction('new-file') },
    { id: 'upload', label: 'Upload File', icon: <FiUpload size={14} />, onClick: () => handleContextMenuAction('upload') },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewFolderInput(true);
        setShowNewFileInput(false);
        setShowUpload(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        navigate('/editor');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setShowUpload(true);
        setShowNewFolderInput(false);
        setShowNewFileInput(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (selectionMode || selectedIds.size > 0 || files.length > 0) {
          e.preventDefault();
          if (selectedIds.size === files.length) {
            setSelectedIds(new Set());
          } else {
            setSelectedIds(new Set(files.map(f => f.id)));
            setSelectionMode(true);
          }
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          copiedIds.current = new Set(selectedIds);
          toast.success(`${selectedIds.size} item(s) copied`);
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedIds.current.size > 0) {
          e.preventDefault();
          filesApi.batchCopy(Array.from(copiedIds.current), folderId || null).then(() => {
            toast.success('Items pasted');
            loadFiles();
          }).catch(() => toast.error('Failed to paste'));
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, files, folderId, selectionMode, navigate, loadFiles]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (contextMenu) return;
    if (!selectionMode) return;

    const container = containerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-file-id]') || target.closest('button') || target.closest('input') || target.closest('textarea')) return;

    selStart.current = { x: e.clientX, y: e.clientY };
    setSelRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selStart.current) return;

    const left = Math.min(selStart.current.x, e.clientX);
    const top = Math.min(selStart.current.y, e.clientY);
    const width = Math.abs(e.clientX - selStart.current.x);
    const height = Math.abs(e.clientY - selStart.current.y);
    setSelRect({ left, top, width, height });

    const selBox = new DOMRect(left, top, width, height);
    const itemRects = getGridItemRects();
    const hitIds = itemRects.filter(({ rect }) => {
      if (rect.width === 0 || rect.height === 0) return false;
      return !(rect.right < selBox.left || rect.left > selBox.right ||
               rect.bottom < selBox.top || rect.top > selBox.bottom);
    }).map(({ id }) => id);

    setSelectedIds(new Set(hitIds));
  };

  const handleMouseUp = () => {
    selStart.current = null;
    setSelRect(null);
  };

  const fileTypes = [
    { label: 'All', value: '' },
    { label: 'Images', value: 'image' },
    { label: 'Documents', value: 'application' },
    { label: 'Text', value: 'text' },
    { label: 'Video', value: 'video' },
    { label: 'Audio', value: 'audio' },
  ];

  return (
    <div
      ref={containerRef}
      className="max-w-6xl mx-auto space-y-6 relative select-none"
      onContextMenu={onContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {selRect && (
        <div
          className="fixed z-30 pointer-events-none border border-cyan/50 bg-cyan/10 rounded-lg"
          style={{
            left: selRect.left,
            top: selRect.top,
            width: selRect.width,
            height: selRect.height,
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {folderId && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl glass hover:bg-white/5 transition-colors text-cyan"
            >
              <FiArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-2xl font-bold">
            {folderId ? 'Folder' : 'My Files'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectionMode}
            className={`p-2 rounded-xl transition-colors ${selectionMode ? 'glass text-coral' : 'text-white/40 hover:text-white'}`}
            title="Toggle selection mode (Ctrl+A)"
          >
            <FiCheckSquare size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'glass text-cyan' : 'text-white/40 hover:text-white'}`}
          >
            <FiGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'glass text-cyan' : 'text-white/40 hover:text-white'}`}
          >
            <FiList size={18} />
          </button>
          <button
            onClick={() => { setShowNewFolderInput(!showNewFolderInput); setShowNewFileInput(false); setShowUpload(false); }}
            className="p-2 rounded-xl glass hover:bg-white/5 transition-colors text-cyan"
            title="New folder (Ctrl+Shift+N)"
          >
            <FiFolderPlus size={18} />
          </button>
          <button
            onClick={() => navigate('/editor')}
            className="p-2 rounded-xl glass hover:bg-white/5 transition-colors text-cyan"
            title="New file (Ctrl+N)"
          >
            <FiFilePlus size={18} />
          </button>
          <button
            onClick={() => { setShowUpload(!showUpload); setShowNewFolderInput(false); setShowNewFileInput(false); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm hover:opacity-90 transition-opacity"
            title="Upload (Ctrl+U)"
          >
            Upload
          </button>
        </div>
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <FiX size={16} />
            </button>
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <span className="text-xs text-white/30 hidden sm:inline">
              <FiCopy size={12} className="inline mr-1" />
              Ctrl+C to copy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowBatchZip(true); setBatchZipName(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/5 text-cyan text-xs"
            >
              <FiArchive size={14} />
              Zip
            </button>
            <button
              onClick={() => setShowBatchMove(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/5 text-cyan text-xs"
            >
              <FiMove size={14} />
              Move
            </button>
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/5 text-coral text-xs"
            >
              <FiTrash2 size={14} />
              Delete
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files... (Ctrl+F)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fileTypes.map(ft => (
            <button
              key={ft.value}
              onClick={() => setTypeFilter(ft.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                typeFilter === ft.value
                  ? 'glass text-cyan'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showNewFolderInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Folder name..."
                className="flex-1 px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30 transition-colors"
              />
              <button onClick={createFolder} className="px-4 py-2 rounded-xl bg-cyan text-space text-sm font-semibold">
                Create
              </button>
              <button onClick={() => setShowNewFolderInput(false)} className="px-3 py-2 rounded-xl text-white/40 hover:text-white text-sm">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewFileInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl p-4 space-y-3">
              <input
                autoFocus
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFile()}
                placeholder="filename.ext (e.g. notes.md, script.py)"
                className="w-full px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30 transition-colors"
              />
              <textarea
                value={newFileContent}
                onChange={e => setNewFileContent(e.target.value)}
                placeholder="File content (optional)..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30 transition-colors resize-none font-mono"
              />
              <div className="flex gap-2">
                <button onClick={createFile} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold">
                  Create File
                </button>
                <button onClick={() => setShowNewFileInput(false)} className="px-3 py-2 rounded-xl text-white/40 hover:text-white text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <UploadZone folderId={folderId} onUploadComplete={loadFiles} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded shimmer w-3/4" />
                <div className="h-2 rounded shimmer w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setContextMenu(null)}
          className="glass rounded-2xl p-12 text-center"
        >
          <FiSearch className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">
            {search || typeFilter ? 'No files match your search' : 'This folder is empty'}
          </p>
          <p className="text-sm text-white/30 mt-1">
            {search || typeFilter
              ? 'Try different search terms or filters'
              : 'Right-click here for options, or use the buttons above'}
          </p>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {files.map(file => (
              <div key={file.id} data-file-id={file.id}>
                <FileCard
                  file={file}
                  viewMode="grid"
                  onRefresh={loadFiles}
                  onClick={() => handleFileClick(file)}
                  selected={selectedIds.has(file.id)}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <AnimatePresence>
            {files.map(file => (
              <div key={file.id} data-file-id={file.id}>
                <FileCard
                  file={file}
                  viewMode="list"
                  onRefresh={loadFiles}
                  onClick={() => handleFileClick(file)}
                  selected={selectedIds.has(file.id)}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={emptyMenuItems} onClose={() => setContextMenu(null)} />
      )}

      {showFolderDetails && folderId && (
        <DetailsDialog fileId={folderId} onClose={() => setShowFolderDetails(false)} />
      )}

      {showFolderDetails && !folderId && (
        <DetailsDialog fileId="" onClose={() => setShowFolderDetails(false)} rootMode={true} />
      )}

      {showBatchZip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBatchZip(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="glass-strong rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-semibold mb-2">Compress to ZIP</h3>
            <p className="text-sm text-white/60 mb-4">{selectedIds.size} items selected</p>
            <input
              autoFocus
              value={batchZipName}
              onChange={e => setBatchZipName(e.target.value)}
              placeholder="Archive name (optional)"
              className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors mb-4"
            />
            <div className="flex flex-col gap-2">
              <button onClick={handleBatchSaveZip} disabled={isProcessing} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold disabled:opacity-50">
                {isProcessing ? 'Creating...' : 'Save to current folder'}
              </button>
              <button onClick={handleBatchZip} disabled={isProcessing} className="w-full py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
                Download ZIP
              </button>
              <button onClick={() => setShowBatchZip(false)} className="w-full py-2 rounded-xl text-white/40 hover:text-white text-xs">
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showBatchDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBatchDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="glass-strong rounded-2xl p-6 w-full max-w-sm text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={24} className="text-coral" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Delete {selectedIds.size} item(s)?</h3>
            <p className="text-sm text-white/60 mb-6">This action cannot be undone</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBatchDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
                Cancel
              </button>
              <button onClick={handleBatchDelete} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-semibold disabled:opacity-50">
                {isProcessing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showBatchMove && (
        <MoveDialog
          fileId={null}
          fileName={`${selectedIds.size} item(s)`}
          currentFolderId={null}
          onClose={() => setShowBatchMove(false)}
          onMoved={handleBatchMoved}
          batchIds={Array.from(selectedIds)}
        />
      )}
    </div>
  );
}
