import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiChevronRight } from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import toast from 'react-hot-toast';
import FileIcon from '../components/Icons/FileIcon';
import FolderIcon from '../components/Icons/FolderIcon';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} className="text-cyan font-semibold">{part}</span>
      : part
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type') || '';

  const [results, setResults] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await filesApi.search(query.trim(), typeFilter || undefined);
      setResults(data);
    } catch {
      toast.error('Search failed');
    }
    setLoading(false);
  }, [query, typeFilter]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const handleClick = (file: FileItem) => {
    if (file.isFolder) {
      navigate(`/folder/${file.id}`);
    } else if (file.folderId) {
      navigate(`/folder/${file.folderId}`);
    } else {
      navigate('/');
    }
  };

  const fileTypes = [
    { label: 'All', value: '' },
    { label: 'Images', value: 'image' },
    { label: 'Documents', value: 'application' },
    { label: 'Text', value: 'text' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Search Results</h2>
        <p className="text-sm text-white/40 mt-1">
          {query ? `Results for "${query}"` : 'Enter a search term'}
          {results.length > 0 && ` — ${results.length} result(s)`}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {fileTypes.map(ft => (
          <button
            key={ft.value}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              if (ft.value) params.set('type', ft.value);
              else params.delete('type');
              navigate(`/search?${params.toString()}`);
            }}
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 shimmer" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-12 text-center">
          <FiSearch className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">No results found</p>
          <p className="text-sm text-white/30 mt-1">Try a different search term</p>
        </motion.div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <AnimatePresence>
            {results.map((file, i) => {
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => handleClick(file)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {file.isFolder ? (
                      <FolderIcon size="md" color="default" />
                    ) : (
                      <FileIcon filename={file.originalName} mime={file.mimeType} size="md" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {highlightText(file.originalName, query)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5 flex-wrap">
                      {file.parentPath && file.parentPath.length > 0 && (
                        <span className="flex items-center gap-1 text-white/30">
                          {file.parentPath.map((p, idx) => (
                            <span key={p.id} className="flex items-center gap-1">
                              {idx > 0 && <FiChevronRight size={10} />}
                              <span>{p.name}</span>
                            </span>
                          ))}
                          <FiChevronRight size={10} className="ml-1" />
                        </span>
                      )}
                      {file.isFolder ? 'Folder' : formatSize(file.size)}
                    </div>
                  </div>
                  <div className="text-xs text-white/30">{new Date(file.createdAt).toLocaleDateString()}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
