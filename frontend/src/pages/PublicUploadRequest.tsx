import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUpload, FiCheck, FiAlertCircle, FiClock, FiFile } from 'react-icons/fi';
import { uploadRequestsApi } from '../services/api';
import { UploadRequest } from '../types';
import toast from 'react-hot-toast';

export default function PublicUploadRequest() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<UploadRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    uploadRequestsApi.access(token)
      .then(data => { setInfo(data); setLoading(false); })
      .catch(() => { setError('This upload link is invalid or expired'); setLoading(false); });
  }, [token]);

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true);
    try {
      await uploadRequestsApi.upload(token, selectedFile);
      setSuccess(true);
      toast.success('File uploaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <div className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan border-t-transparent rounded-full mx-auto" />
        <p className="text-white/40 mt-4">Loading...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
        <FiAlertCircle className="mx-auto text-coral mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Link Unavailable</h2>
        <p className="text-white/40 text-sm">{error}</p>
      </motion.div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm text-center">
        <FiCheck className="mx-auto text-cyan mb-4" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Upload Successful!</h2>
        <p className="text-white/40 text-sm">Your file has been uploaded.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <FiUpload className="mx-auto text-cyan mb-3" size={40} />
          <h2 className="text-xl font-bold text-white">Upload Request</h2>
          <p className="text-white/40 text-sm mt-1">Upload a file to this shared folder</p>
        </div>

        {info?.expiresAt && (
          <div className="flex items-center gap-2 text-xs text-white/40 mb-6 justify-center">
            <FiClock size={12} />
            Expires {new Date(info.expiresAt).toLocaleDateString()}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center p-8 rounded-2xl glass border-2 border-dashed border-white/10 hover:border-cyan/30 cursor-pointer transition-colors">
            <FiFile size={32} className="text-white/20 mb-2" />
            {selectedFile ? (
              <p className="text-sm text-cyan">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</p>
            ) : (
              <>
                <p className="text-sm text-white/40">Click to select a file</p>
                {info?.maxSizeBytes && (
                  <p className="text-xs text-white/20 mt-1">Max size: {(info.maxSizeBytes / 1024 / 1024).toFixed(0)} MB</p>
                )}
              </>
            )}
            <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          </label>

          <button onClick={handleUpload} disabled={!selectedFile || uploading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
