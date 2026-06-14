import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiList, FiSearch, FiArrowLeft, FiFolderPlus, FiFilter } from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import FileCard from '../components/FileCard';
import UploadZone from '../components/UploadZone';
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
  const [newFolderName, setNewFolderName] = useState('');

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

  const handleFileClick = (file: FileItem) => {
    if (file.isFolder) {
      navigate(`/folder/${file.id}`);
    }
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
    <div className="max-w-6xl mx-auto space-y-6">
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
            onClick={() => { setShowNewFolderInput(!showNewFolderInput); setShowUpload(false); }}
            className="p-2 rounded-xl glass hover:bg-white/5 transition-colors text-cyan"
            title="New folder"
          >
            <FiFolderPlus size={18} />
          </button>
          <button
            onClick={() => { setShowUpload(!showUpload); setShowNewFolderInput(false); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Upload
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
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
                className="flex-1 px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
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
          className="glass rounded-2xl p-12 text-center"
        >
          <FiSearch className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">
            {search || typeFilter ? 'No files match your search' : 'This folder is empty'}
          </p>
          <p className="text-sm text-white/30 mt-1">
            {search || typeFilter ? 'Try different search terms or filters' : 'Upload files or create a folder to get started'}
          </p>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                viewMode="grid"
                onRefresh={loadFiles}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <AnimatePresence>
            {files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                viewMode="list"
                onRefresh={loadFiles}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
