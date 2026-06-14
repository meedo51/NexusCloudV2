import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiDownload, FiFile, FiAlertCircle } from 'react-icons/fi';
import { shareApi } from '../services/api';
import { ShareAccessResponse } from '../types';
import toast from 'react-hot-toast';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareAccessResponse | null>(null);
  const [password, setPassword] = useState('');
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccess = async (pass?: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await shareApi.access(token, pass);
      if (res.protected) setHasPassword(true);
      setData(res);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to access shared file';
      setError(msg);
      if (err.response?.status === 404) setError('This link does not exist');
      else if (err.response?.status === 410) setError('This link has expired');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccess();
  }, [token]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAttempt(password);
    await fetchAccess(password);
  };

  const handleDownload = async () => {
    if (!token) return;
    try {
      const pass = hasPassword ? passwordAttempt : undefined;
      const blob = await shareApi.download(token, pass);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data?.file?.name || 'download';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="gradient-mesh" />
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FiFile size={28} className="text-cyan/60" />
          </div>
          <p className="text-white/40">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="gradient-mesh" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center"
        >
          <FiAlertCircle className="mx-auto mb-4 text-coral" size={48} />
          <h2 className="text-xl font-bold mb-2">Link Unavailable</h2>
          <p className="text-white/60 text-sm">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (data?.protected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="gradient-mesh" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
            <FiLock size={28} className="text-coral" />
          </div>
          <h2 className="text-xl font-bold mb-2">Password Required</h2>
          <p className="text-white/60 text-sm mb-6">This file is password protected</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-cyan/10 flex items-center justify-center mx-auto mb-4">
          <FiFile size={28} className="text-cyan" />
        </div>
        <h2 className="text-xl font-bold mb-1">{data?.file?.name}</h2>
        <p className="text-white/60 text-sm mb-6">
          {data?.file?.mimeType} &middot; {data?.file?.size ? formatSize(data.file.size) : 'Unknown size'}
        </p>

        <button
          onClick={handleDownload}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <FiDownload size={18} />
          Download File
        </button>

        <p className="text-xs text-white/30 mt-4">
          Link expires: {data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'N/A'}
        </p>
      </motion.div>
    </div>
  );
}
