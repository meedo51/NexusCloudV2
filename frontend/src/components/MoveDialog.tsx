import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronRight } from 'react-icons/fi';
import { filesApi } from '../services/api';
import toast from 'react-hot-toast';
import FolderIcon from './Icons/FolderIcon';

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
}

interface MoveDialogProps {
  fileId: string | null;
  fileName: string;
  currentFolderId: string | null;
  onClose: () => void;
  onMoved: () => void;
  batchIds?: string[];
}

export default function MoveDialog({ fileId, fileName, currentFolderId, onClose, onMoved, batchIds }: MoveDialogProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    filesApi.allFolders().then(data => {
      const filtered = batchIds
        ? data.filter((f: FolderNode) => !batchIds.includes(f.id))
        : data.filter((f: FolderNode) => f.id !== fileId);
      setFolders(filtered);
    }).catch(() => toast.error('Failed to load folders'))
    .finally(() => setLoading(false));
  }, [fileId, batchIds]);

  const rootFolders = folders.filter(f => f.parentId === null);
  const getChildren = (parentId: string) => folders.filter(f => f.parentId === parentId);

  const handleMove = async () => {
    setSaving(true);
    try {
      if (batchIds) {
        await filesApi.batchMove(batchIds, selectedId);
      } else if (fileId) {
        const targetId = selectedId === currentFolderId ? null : selectedId;
        await filesApi.move(fileId, targetId);
      }
      toast.success('Moved successfully');
      onMoved();
      onClose();
    } catch {
      toast.error('Failed to move');
    }
    setSaving(false);
  };

  const renderFolderTree = (folderList: FolderNode[], depth = 0) => {
    return folderList.map(folder => {
      const children = getChildren(folder.id);
      const isSelected = selectedId === folder.id;
      return (
        <div key={folder.id}>
          <button
            onClick={() => setSelectedId(folder.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
              isSelected
                ? 'glass text-cyan'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <FolderIcon size="sm" color="default" />
            <span className="truncate">{folder.name}</span>
            {children.length > 0 && <FiChevronRight size={12} className="ml-auto text-white/20" />}
          </button>
          {children.length > 0 && (
            <div>{renderFolderTree(children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Move to folder</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <FiX size={18} />
            </button>
          </div>

          <p className="text-sm text-white/60 mb-4 truncate">{fileName}</p>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5 mb-4 rounded-xl glass p-2">
            <button
              onClick={() => setSelectedId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                selectedId === null
                  ? 'glass text-cyan'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderIcon size="sm" color="default" />
              <span>Root (no folder)</span>
            </button>
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 rounded-xl shimmer" />
                ))}
              </div>
            ) : (
              renderFolderTree(rootFolders)
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass hover:bg-white/5 transition-colors text-sm">
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Moving...' : 'Move here'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
