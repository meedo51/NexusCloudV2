import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiPlus, FiTrash2, FiClock, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { documentsApi } from '../services/api';
import type { NexusDocument } from '../types';

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi.list()
      .then(setDocuments)
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await documentsApi.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Documents</h1>
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
              className="glass rounded-xl p-4 border border-white/5 hover:border-cyan/30 transition-all cursor-pointer group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/10 to-transparent flex items-center justify-center">
                  <FiFileText size={18} className="text-cyan/60" />
                </div>
                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <FiTrash2 size={14} />
                </button>
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
    </div>
  );
}

