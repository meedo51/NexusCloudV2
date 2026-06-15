import { useState } from 'react';
import { webdavApi } from '../services/api';
import { WebDAVInfo } from '../types';

export default function WebDAVSettings() {
  const [info, setInfo] = useState<WebDAVInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const data = await webdavApi.info();
      setInfo(data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">WebDAV Access</h1>
        <p className="text-white/50 mt-1">Mount your NexusCloud as a network drive</p>
      </div>

      {!info ? (
        <button onClick={loadInfo} disabled={loading} className="px-6 py-2.5 bg-cyan text-dark font-medium rounded-xl hover:bg-cyan/90 transition disabled:opacity-50">
          {loading ? 'Loading...' : 'Show Connection Info'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="glass p-6 rounded-2xl space-y-3">
            <h2 className="text-lg font-semibold text-white">Connection Details</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-white/40">Server URL</label>
                <code className="block text-cyan bg-white/5 px-3 py-2 rounded-lg mt-1 break-all select-all">{info.url}</code>
              </div>
              <div>
                <label className="text-xs text-white/40">Username</label>
                <p className="text-white bg-white/5 px-3 py-2 rounded-lg mt-1">{info.username} (use your email)</p>
              </div>
              <div>
                <label className="text-xs text-white/40">Password</label>
                <p className="text-white/70 bg-white/5 px-3 py-2 rounded-lg mt-1">Use your NexusCloud account password</p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl space-y-3">
            <h2 className="text-lg font-semibold text-white">Mount Instructions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-cyan mb-1">Windows</h3>
                <p className="text-sm text-white/60">{info.instructions.windows}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-cyan mb-1">macOS</h3>
                <p className="text-sm text-white/60">{info.instructions.mac}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-cyan mb-1">Linux</h3>
                <p className="text-sm text-white/60">{info.instructions.linux}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
