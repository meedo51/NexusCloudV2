import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLink, FiCopy, FiLock, FiClock, FiEye, FiDownload, FiUpload, FiMaximize2 } from 'react-icons/fi';
import { shareApi } from '../services/api';
import toast from 'react-hot-toast';
import QRCodeModal from './QRCodeModal';

interface ShareDialogProps {
  fileId: string;
  fileName: string;
  isFolder?: boolean;
  onClose: () => void;
}

const permissions = [
  { value: 'view', label: 'View Only', icon: FiEye, desc: 'Recipients can view the folder contents' },
  { value: 'download', label: 'View & Download', icon: FiDownload, desc: 'Recipients can view and download files' },
  { value: 'upload', label: 'View, Download & Upload', icon: FiUpload, desc: 'Recipients can view, download, and upload files' },
];

export default function ShareDialog({ fileId, fileName, isFolder = false, onClose }: ShareDialogProps) {
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState(7);
  const [permission, setPermission] = useState(isFolder ? 'view' : 'download');
  const [allowUpload, setAllowUpload] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [shareToken, setShareToken] = useState('');

  const canUpload = permission === 'upload';

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await shareApi.create(fileId, password || undefined, expiresIn, permission, canUpload);
      const url = `${window.location.origin}/s/${res.token}`;
      setShareUrl(url);
      setShareToken(res.token);
      toast.success('Share link created!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create share link');
    }
    setLoading(false);
  };

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('Link copied to clipboard!');
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast.success('Link copied to clipboard!');
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
          className="glass-strong rounded-2xl p-6 w-full max-w-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Share {isFolder ? 'Folder' : 'File'}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <FiX size={18} />
            </button>
          </div>

          <p className="text-sm text-white/60 mb-4 truncate">{fileName}</p>

          {shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                <FiLink className="text-cyan flex-shrink-0" size={16} />
                <input
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-sm flex-1 outline-none truncate"
                />
                <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-white/5 text-cyan">
                  <FiCopy size={16} />
                </button>
                <button onClick={() => setShowQR(true)} className="p-1.5 rounded-lg hover:bg-white/5 text-purple">
                  <FiMaximize2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <FiClock size={12} />
                <span>Expires in {expiresIn} day(s)</span>
                {password && (
                  <>
                    <FiLock size={12} className="ml-2" />
                    <span>Password protected</span>
                  </>
                )}
                {isFolder && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan/10 text-cyan text-[10px]">
                    {permissions.find(p => p.value === permission)?.label}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl glass hover:bg-white/5 transition-colors text-sm">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1.5">
                  <FiClock className="inline mr-1" size={12} />
                  Expires in (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresIn}
                  onChange={e => setExpiresIn(parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 rounded-xl glass text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-1.5">
                  <FiLock className="inline mr-1" size={12} />
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  className="w-full px-3 py-2 rounded-xl glass text-sm text-white placeholder-white/20 outline-none"
                />
              </div>

              {isFolder && (
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Access Permission</label>
                  <div className="space-y-1.5">
                    {permissions.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setPermission(p.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                          permission === p.value
                            ? 'glass text-cyan'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <p.icon size={16} />
                        <div className="text-left">
                          <p className="text-sm font-medium">{p.label}</p>
                          <p className="text-xs text-white/30">{p.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={generateLink}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Generate Share Link'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={shareUrl}
        title={fileName}
        subtitle={`Expires in ${expiresIn} day(s)`}
        type="share"
        meta={{
          expiresAt: new Date(Date.now() + expiresIn * 86400000).toISOString(),
          passwordProtected: !!password,
          permission,
        }}
      />
    </AnimatePresence>
  );
}
