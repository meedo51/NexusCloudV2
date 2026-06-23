import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiLink, FiTrash2, FiCopy, FiClock, FiDownload, FiFolder, FiEye, FiUpload, FiMaximize2 } from 'react-icons/fi';
import { shareApi } from '../services/api';
import { ShareLink } from '../types';
import toast from 'react-hot-toast';
import QRCodeModal from '../components/QRCodeModal';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ShareManage() {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrTarget, setQrTarget] = useState<{ url: string; title: string; meta: any } | null>(null);

  const loadShares = async () => {
    setLoading(true);
    try {
      const data = await shareApi.list();
      setShares(data);
    } catch {
      toast.error('Failed to load shares');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadShares();
  }, []);

  const deleteShare = async (id: string) => {
    try {
      await shareApi.delete(id);
      toast.success('Share link deleted');
      loadShares();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
    toast.success('Link copied!');
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shared Links</h2>
        <p className="text-sm text-white/40 mt-1">Manage your shared file links</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 shimmer">
              <div className="h-4 rounded w-1/3 mb-2" />
              <div className="h-3 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : shares.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-12 text-center"
        >
          <FiLink className="mx-auto mb-3 text-white/20" size={48} />
          <p className="text-lg font-medium text-white/60">No shared links yet</p>
          <p className="text-sm text-white/30 mt-1">Share a file to create your first link</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {shares.map((share, i) => (
            <motion.div
              key={share.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-xl p-4 ${isExpired(share.expiresAt) ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium truncate flex items-center gap-1.5">
                      {share.isFolder && <FiFolder size={14} className="text-cyan/60 flex-shrink-0" />}
                      {share.originalName || share.fileName || 'Unknown file'}
                    </h4>
                    {isExpired(share.expiresAt) && (
                      <span className="px-2 py-0.5 rounded-full bg-coral/20 text-coral text-[10px] font-medium">Expired</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {share.size && <span>{formatSize(share.size)}</span>}
                    <span className="flex items-center gap-1">
                      <FiClock size={10} />
                      {formatDate(share.expiresAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiDownload size={10} />
                      {share.downloads} downloads
                    </span>
                    {share.passwordHash && <span className="text-coral/60">🔒 Protected</span>}
                    {share.permission && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan/10 text-cyan text-[10px] font-medium">
                        {share.permission === 'view' ? 'View' : share.permission === 'upload' ? 'Upload' : 'Download'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/s/${share.token}`;
                      setQrTarget({
                        url,
                        title: share.originalName || share.fileName || 'Shared file',
                        meta: { expiresAt: share.expiresAt, passwordProtected: !!share.passwordHash, downloads: share.downloads, permission: share.permission },
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-purple transition-colors"
                    title="Show QR code"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                  <button
                    onClick={() => copyLink(share.token)}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
                    title="Copy link"
                  >
                    <FiCopy size={16} />
                  </button>
                  <button
                    onClick={() => deleteShare(share.id)}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-coral transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <QRCodeModal
        isOpen={!!qrTarget}
        onClose={() => setQrTarget(null)}
        url={qrTarget?.url || ''}
        title={qrTarget?.title || ''}
        type="share"
        meta={qrTarget?.meta}
      />
    </div>
  );
}
