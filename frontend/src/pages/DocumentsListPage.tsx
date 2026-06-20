import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiFileText, FiPlus, FiTrash2, FiClock, FiChevronRight,
  FiEdit2, FiDownload, FiCloud, FiInfo, FiCopy,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { documentsApi, filesApi } from '../services/api';
import ContextMenu from '../components/ContextMenu/ContextMenu';
import type { ContextMenuItem } from '../components/ContextMenu/ContextMenu';
import { DeleteConfirmModal, RenameModal, DetailsPanel } from '../components/Modals';
import type { NexusDocument } from '../types';

type CtxMenuState = {
  doc: NexusDocument;
  x: number;
  y: number;
};

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<NexusDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NexusDocument | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<NexusDocument | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    documentsApi.list()
      .then(setDocuments)
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, doc: NexusDocument) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ doc, x: e.clientX, y: e.clientY });
  }, []);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const handleRename = useCallback(async (name: string) => {
    if (!renameTarget) return;
    setActionLoading(true);
    try {
      await documentsApi.update(renameTarget.id, { name });
      setDocuments(prev => prev.map(d => d.id === renameTarget.id ? { ...d, name } : d));
      toast.success('Document renamed');
      setRenameTarget(null);
    } catch {
      toast.error('Failed to rename document');
    } finally {
      setActionLoading(false);
    }
  }, [renameTarget]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await documentsApi.delete(deleteTarget.id);
      setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
      toast.success('Document deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget]);

  const handleDuplicate = useCallback(async (doc: NexusDocument) => {
    try {
      await documentsApi.create({
        name: `${doc.name} (copy)`,
        content: doc.content,
      });
      const updated = await documentsApi.list();
      setDocuments(updated);
      toast.success('Document duplicated');
    } catch {
      toast.error('Failed to duplicate document');
    }
  }, []);

  const handleExportCloud = useCallback(async (doc: NexusDocument) => {
    try {
      const html = `<html><body>${doc.content}</body></html>`;
      await filesApi.createFile(`${doc.name}.html`, html, undefined);
      toast.success('Exported to cloud storage');
    } catch {
      toast.error('Failed to export to cloud');
    }
  }, []);

  const handleDownload = useCallback(async (doc: NexusDocument, format: string) => {
    try {
      let content: string;
      let mime: string;
      let ext: string;

      switch (format) {
        case 'html': {
          content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title></head><body>${doc.content}</body></html>`;
          mime = 'text/html';
          ext = 'html';
          break;
        }
        case 'markdown': {
          const { default: TurndownService } = await import('turndown');
          const td = new TurndownService();
          content = td.turndown(doc.content);
          mime = 'text/markdown';
          ext = 'md';
          break;
        }
        case 'text': {
          const div = document.createElement('div');
          div.innerHTML = doc.content;
          content = div.textContent || div.innerText || '';
          mime = 'text/plain';
          ext = 'txt';
          break;
        }
        default:
          return;
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${ext.toUpperCase()}`);
    } catch {
      toast.error(`Failed to download ${format}`);
    }
  }, []);

  const buildCtxItems = useCallback((doc: NexusDocument): ContextMenuItem[] => [
    {
      id: 'open', label: 'Open', icon: <FiFileText size={14} />,
      action: () => navigate(`/documents/${doc.id}`),
    },
    {
      id: 'rename', label: 'Rename', icon: <FiEdit2 size={14} />,
      action: () => { setRenameTarget(doc); },
    },
    {
      id: 'duplicate', label: 'Duplicate', icon: <FiCopy size={14} />,
      action: () => handleDuplicate(doc),
    },
    { id: 'div1', divider: true },
    {
      id: 'download', label: 'Download', icon: <FiDownload size={14} />,
      subItems: [
        { id: 'dl-html', label: 'HTML', action: () => handleDownload(doc, 'html') },
        { id: 'dl-md', label: 'Markdown', action: () => handleDownload(doc, 'markdown') },
        { id: 'dl-txt', label: 'Plain Text', action: () => handleDownload(doc, 'text') },
      ],
    },
    {
      id: 'export-cloud', label: 'Export to Cloud', icon: <FiCloud size={14} />,
      action: () => handleExportCloud(doc),
    },
    { id: 'div2', divider: true },
    {
      id: 'details', label: 'Details', icon: <FiInfo size={14} />,
      action: () => { setDetailsTarget(doc); },
    },
    {
      id: 'delete', label: 'Delete', icon: <FiTrash2 size={14} />, color: 'text-red-400',
      action: () => { setDeleteTarget(doc); },
    },
  ], [navigate, handleDuplicate, handleDownload, handleExportCloud]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6" onClick={closeCtxMenu}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-cyan to-blue-400 bg-clip-text text-transparent">NexusDocs</h1>
          <p className="text-white/40 text-sm mt-1">Create and edit rich text documents</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/documents/new')}
          className="glass rounded-xl px-4 py-2.5 text-sm text-white flex items-center gap-2 border border-cyan/20 hover:border-cyan/40 transition-all"
        >
          <FiPlus size={16} className="text-cyan" />
          New Document
        </motion.button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass rounded-xl p-4 border border-white/5 shimmer h-28" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/10 to-transparent border border-cyan/10 flex items-center justify-center mx-auto mb-4">
            <FiFileText size={24} className="text-cyan/40" />
          </div>
          <p className="text-white/40 text-sm">No documents yet</p>
          <p className="text-white/20 text-xs mt-1">Create your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/documents/${doc.id}`)}
              onContextMenu={(e) => handleContextMenu(e, doc)}
              className="glass rounded-xl p-4 border border-white/5 hover:border-cyan/30 transition-all cursor-pointer group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/10 to-transparent flex items-center justify-center">
                  <FiFileText size={18} className="text-cyan/60" />
                </div>
              </div>
              <h3 className="text-white text-sm font-medium truncate mb-1">{doc.name}</h3>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1">
                  <FiClock size={11} />
                  {formatDate(doc.updatedAt)}
                </span>
                <span>{doc.wordCount} words</span>
              </div>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                <FiChevronRight size={16} className="text-cyan/40" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ContextMenu
        items={ctxMenu ? buildCtxItems(ctxMenu.doc) : []}
        position={ctxMenu ? { x: ctxMenu.x, y: ctxMenu.y } : null}
        onClose={closeCtxMenu}
      />

      <RenameModal
        open={!!renameTarget}
        currentName={renameTarget?.name ?? ''}
        onConfirm={handleRename}
        onCancel={() => setRenameTarget(null)}
        loading={actionLoading}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        itemName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={actionLoading}
      />

      <DetailsPanel
        open={!!detailsTarget}
        document={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />
    </div>
  );
}
