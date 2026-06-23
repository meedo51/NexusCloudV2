import { useState, useEffect } from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { uploadRequestsApi } from '../services/api';
import { UploadRequest, FileItem } from '../types';
import toast from 'react-hot-toast';
import QRCodeModal from '../components/QRCodeModal';

export default function UploadRequestPage() {
  const [requests, setRequests] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ url: string; title: string; token: string } | null>(null);
  const [folderId, setFolderId] = useState('');
  const [expiresIn, setExpiresIn] = useState(24);
  const [maxSize, setMaxSize] = useState(50);
  const [allowedTypes, setAllowedTypes] = useState('');
  const [allFolders, setAllFolders] = useState<FileItem[]>([]);

  useEffect(() => {
    loadRequests();
    // Load folders for the picker
    import('../services/api').then(({ filesApi }) =>
      filesApi.list({ sortBy: 'name', sortOrder: 'asc' }).then(files =>
        setAllFolders(files.filter(f => f.isFolder))
      )
    ).catch(() => {});
  }, []);

  const loadRequests = async () => {
    try {
      const data = await uploadRequestsApi.list();
      setRequests(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const createRequest = async () => {
    if (!folderId) { toast.error('Select a target folder'); return; }
    try {
      await uploadRequestsApi.create({
        folderId,
        expiresInHours: expiresIn,
        maxSizeBytes: maxSize * 1024 * 1024,
        allowedTypes: allowedTypes ? allowedTypes.split(',').map(t => t.trim()) : [],
      });
      toast.success('Upload request created');
      setShowCreate(false);
      loadRequests();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create'); }
  };

  const deleteRequest = async (id: string) => {
    try {
      await uploadRequestsApi.delete(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Request deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/request/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Requests</h1>
          <p className="text-white/50 mt-1">Let others upload files to your folders</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-cyan text-dark rounded-xl hover:bg-cyan/90 transition">
          {showCreate ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {showCreate && (
        <div className="glass p-6 rounded-2xl space-y-4">
          <select value={folderId} onChange={e => setFolderId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl glass text-white outline-none focus:border-cyan/30">
            <option value="">Select target folder...</option>
            {allFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-white/40 block mb-1">Expires in (hours)</label>
              <input type="number" value={expiresIn} onChange={e => setExpiresIn(Number(e.target.value))} min={1} className="w-full px-3 py-2 rounded-xl glass text-white outline-none focus:border-cyan/30" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 block mb-1">Max file size (MB)</label>
              <input type="number" value={maxSize} onChange={e => setMaxSize(Number(e.target.value))} min={1} className="w-full px-3 py-2 rounded-xl glass text-white outline-none focus:border-cyan/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Allowed types (comma-separated, leave empty for all)</label>
            <input type="text" value={allowedTypes} onChange={e => setAllowedTypes(e.target.value)} placeholder="image/*, application/pdf" className="w-full px-4 py-2.5 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30" />
          </div>
          <button onClick={createRequest} className="px-6 py-2.5 bg-cyan text-dark rounded-xl hover:bg-cyan/90 transition">Create Request</button>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-white/30">Loading...</div> : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center">
              <p className="text-white/40">No upload requests yet</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="glass p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">
                    <code className="text-cyan">{req.token.substring(0, 12)}...</code>
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Folder: {req.folderId} · Expires: {new Date(req.expiresAt).toLocaleDateString()}
                    {req.maxSizeBytes && ` · Max: ${(req.maxSizeBytes / 1024 / 1024).toFixed(0)}MB`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/request/${req.token}`;
                      setQrTarget({ url, title: `Upload Request`, token: req.token });
                    }}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-purple transition-colors"
                    title="Show QR code"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                  <button onClick={() => copyLink(req.token)} className="px-3 py-1.5 bg-cyan/20 text-cyan rounded-xl text-xs hover:bg-cyan/30 transition">Copy Link</button>
                  <button onClick={() => deleteRequest(req.id)} className="px-3 py-1.5 bg-red/20 text-red rounded-xl text-xs hover:bg-red/30 transition">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      <QRCodeModal
        isOpen={!!qrTarget}
        onClose={() => setQrTarget(null)}
        url={qrTarget?.url || ''}
        title={qrTarget?.title || ''}
        subtitle={`Token: ${qrTarget?.token?.substring(0, 12)}...`}
        type="upload"
        meta={qrTarget ? { expiresAt: requests.find(r => `${window.location.origin}/request/${r.token}` === qrTarget.url)?.expiresAt } : undefined}
      />
    </div>
  );
}
