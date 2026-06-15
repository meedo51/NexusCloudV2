import { useState, useEffect } from 'react';
import { activitiesApi } from '../services/api';
import { ActivityLogEntry } from '../types';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await activitiesApi.list({ action: action || undefined, page, limit });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [page, action]);

  const exportCSV = async () => {
    try {
      const blob = await activitiesApi.exportCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'activity-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const actionColors: Record<string, string> = {
    upload: 'text-cyan', download: 'text-green', delete: 'text-red',
    permanent_delete: 'text-red', restore: 'text-green', rename: 'text-yellow',
    move: 'text-blue', create: 'text-cyan', share_create: 'text-purple',
    share_access: 'text-purple', login: 'text-white/60',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition text-sm">
          Export CSV
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'upload', 'download', 'delete', 'restore', 'rename', 'move', 'create', 'share_create', 'login'].map(a => (
          <button key={a} onClick={() => { setAction(a); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs capitalize transition ${action === a ? 'bg-cyan/20 text-cyan' : 'bg-white/5 text-white/50 hover:text-white'}`}>
            {a || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-white/30">Loading...</div> : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="glass p-3 rounded-xl flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium capitalize ${actionColors[log.action] || 'text-white/60'}`}>{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-white text-sm truncate">{log.itemName}</span>
                </div>
                <div className="text-xs text-white/30 mt-1">
                  {log.itemType} · {new Date(log.createdAt).toLocaleString()}
                  {log.ipAddress && ` · ${log.ipAddress}`}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center py-12 text-white/30">No activity found</p>}
          {total > limit && (
            <div className="flex justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-white/10 text-white rounded-xl disabled:opacity-30">Previous</button>
              <span className="px-3 py-1.5 text-white/50">Page {page} of {Math.ceil(total / limit)}</span>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-white/10 text-white rounded-xl disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
