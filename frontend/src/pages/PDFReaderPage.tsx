import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiArrowLeft, FiSearch } from 'react-icons/fi';
import api from '../services/api';
import NexusPDF from '../apps/NexusPDF/NexusPDF';

interface FileEntry {
  id: string;
  name: string;
  originalName: string;
  size: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function PDFReaderPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (fileId) return;
    async function loadPdfFiles() {
      setLoading(true);
      try {
        const data = await api.get('/files', { params: { mimeType: 'application/pdf' } }).then(r => r.data);
        setFiles(data?.files || data || []);
      } catch {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    }
    loadPdfFiles();
  }, [fileId]);

  if (fileId) {
    return <NexusPDF fileId={fileId} onBack={() => navigate('/pdf')} />;
  }

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.originalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <button onClick={() => navigate('/studio')} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
          <FiArrowLeft size={14} />
          Back to Studio
        </button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan bg-clip-text text-transparent">
          NexusPDF Reader
        </h1>
        <p className="text-white/40 text-sm mt-1">Select a PDF to read</p>
      </div>

      <div className="relative mb-4 max-w-md">
        <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search PDF files..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-cyan/30 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FiFileText size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/30">No PDF files found</p>
          <p className="text-white/20 text-sm mt-1">Upload PDF files to your Files to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/pdf/${file.id}`)}
              className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-500/30 hover:bg-white/10 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                  <FiFileText size={20} className="text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-sm font-medium truncate">{file.originalName || file.name}</p>
                  <p className="text-white/30 text-xs">{formatSize(file.size)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
