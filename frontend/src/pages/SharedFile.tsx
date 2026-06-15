import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiDownload, FiFile, FiAlertCircle, FiFolder, FiUpload, FiChevronRight, FiHome } from 'react-icons/fi';
import { shareApi } from '../services/api';
import { ShareAccessResponse, SharedFolderFile } from '../types';
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
  const [folderFiles, setFolderFiles] = useState<SharedFolderFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAccess = async (pass?: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await shareApi.access(token, pass);
      if (res.protected) setHasPassword(true);
      setData(res);
      if (res.isFolder && res.files) {
        setFolderFiles(res.files);
      }
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
      a.download = data?.file?.name || (data?.folder?.name || 'download') + '.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const navigateFolder = async (folderId?: string) => {
    if (!token) return;
    try {
      const pass = hasPassword ? passwordAttempt : undefined;
      const res = await shareApi.accessFolder(token, pass, folderId);
      setFolderFiles(res.files);
      setCurrentFolderId(folderId);
    } catch {
      toast.error('Failed to load folder');
    }
  };

  const openFolder = (entry: SharedFolderFile) => {
    if (!entry.isFolder) return;
    setFolderBreadcrumb(prev => {
      if (currentFolderId) {
        const name = folderFiles.find(f => f.id === currentFolderId)?.name || '';
        return [...prev, { id: currentFolderId, name }];
      }
      return prev;
    });
    navigateFolder(entry.id);
  };

  const goToRoot = () => {
    setFolderBreadcrumb([]);
    setCurrentFolderId(undefined);
    fetchAccess(hasPassword ? passwordAttempt : undefined);
  };

  const goToBreadcrumb = (index: number) => {
    if (index < 0) {
      goToRoot();
      return;
    }
    const target = folderBreadcrumb[index];
    setFolderBreadcrumb(prev => prev.slice(0, index));
    navigateFolder(target.id);
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true);
    try {
      const pass = hasPassword ? passwordAttempt : undefined;
      await shareApi.upload(token, selectedFile, pass);
      toast.success('File uploaded');
      setSelectedFile(null);
      navigateFolder(currentFolderId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  };

  const downloadFile = async (fileId: string, fileName: string) => {
    if (!token) return;
    try {
      const pass = hasPassword ? passwordAttempt : undefined;
      const blob = await shareApi.downloadFile(token, fileId, pass);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
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
          <p className="text-white/40">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="gradient-mesh" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
            <FiLock size={28} className="text-coral" />
          </div>
          <h2 className="text-xl font-bold mb-2">Password Required</h2>
          <p className="text-white/60 text-sm mb-6">This shared item is password protected</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors" autoFocus />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white font-semibold hover:opacity-90 transition-opacity">
              Unlock
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (data?.isFolder) {
    const canDownload = data.permission === 'download' || data.permission === 'upload';
    const canUpload = data.allowUpload;

    return (
      <div className="min-h-screen flex items-start justify-center p-4 pt-12">
        <div className="gradient-mesh" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6 w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <FiFolder size={24} className="text-cyan" />
            <div>
              <h2 className="text-lg font-bold">{data.folder?.name || 'Shared Folder'}</h2>
              <p className="text-xs text-white/40">
                {canUpload ? 'View, Download & Upload' : canDownload ? 'View & Download' : 'View Only'}
                {data.expiresAt ? ` · Expires ${new Date(data.expiresAt).toLocaleDateString()}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-white/40 mb-4 flex-wrap">
            <button onClick={goToRoot} className="hover:text-cyan transition-colors"><FiHome size={12} className="inline" /> Root</button>
            {folderBreadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <FiChevronRight size={10} />
                <button onClick={() => goToBreadcrumb(i)} className="hover:text-cyan transition-colors">{crumb.name}</button>
              </span>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            {folderFiles.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">This folder is empty</p>
            ) : (
              folderFiles.map(entry => (
                <div key={entry.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                  {entry.isFolder ? (
                    <FiFolder size={16} className="text-cyan/60 flex-shrink-0" />
                  ) : (
                    <FiFile size={16} className="text-white/40 flex-shrink-0" />
                  )}
                  <span className="text-sm flex-1 truncate">{entry.name}</span>
                  {entry.size > 0 && !entry.isFolder && (
                    <span className="text-xs text-white/30">{formatSize(entry.size)}</span>
                  )}
                  {entry.isFolder ? (
                    <button onClick={() => openFolder(entry)}
                      className="text-xs text-cyan/60 hover:text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      Open
                    </button>
                  ) : canDownload ? (
                    <button onClick={() => downloadFile(entry.id, entry.name)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-cyan opacity-0 group-hover:opacity-100 transition-all">
                      <FiDownload size={14} />
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {canDownload && (
            <button onClick={handleDownload}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-3">
              <FiDownload size={16} />
              Download All as ZIP
            </button>
          )}

          {canUpload && (
            <div className="border-t border-white/5 pt-4">
              <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                <FiUpload size={14} /> Upload to this folder
              </h3>
              <div className="flex items-center gap-2">
                <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-cyan/10 file:text-cyan file:text-xs file:font-medium hover:file:bg-cyan/20" />
                <button onClick={handleUpload} disabled={!selectedFile || uploading}
                  className="px-4 py-2 rounded-xl bg-cyan text-space text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {uploading ? '...' : 'Upload'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-cyan/10 flex items-center justify-center mx-auto mb-4">
          <FiFile size={28} className="text-cyan" />
        </div>
        <h2 className="text-xl font-bold mb-1">{data?.file?.name}</h2>
        <p className="text-white/60 text-sm mb-6">
          {data?.file?.mimeType} &middot; {data?.file?.size ? formatSize(data.file.size) : 'Unknown size'}
        </p>

        <button onClick={handleDownload}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
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
