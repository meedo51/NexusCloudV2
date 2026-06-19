import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspacesApi } from '../services/api';
import { Workspace } from '../types';
import toast from 'react-hot-toast';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    workspacesApi.list().then(setWorkspaces).catch(() => toast.error('Failed to load workspaces')).finally(() => setLoading(false));
  }, []);

  const createWorkspace = async () => {
    if (!name.trim()) { toast.error('Workspace name is required'); return; }
    try {
      const ws = await workspacesApi.create({ name: name.trim(), description });
      setWorkspaces(prev => [ws, ...prev]);
      setShowCreate(false);
      setName('');
      setDescription('');
      toast.success('Workspace created');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create workspace');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-white/50 mt-1">Collaborate with your team</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-cyan text-dark font-medium rounded-xl hover:bg-cyan/90 transition">
          {showCreate ? 'Cancel' : 'New Workspace'}
        </button>
      </div>

      {showCreate && (
        <div className="glass p-6 rounded-2xl space-y-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Workspace name" className="w-full px-4 py-2.5 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full px-4 py-2.5 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30" />
          <button onClick={createWorkspace} className="px-6 py-2.5 bg-cyan text-dark font-medium rounded-xl hover:bg-cyan/90 transition">Create</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-white/30">Loading...</div>
      ) : workspaces.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <p className="text-white/40 text-lg mb-2">No workspaces yet</p>
          <p className="text-white/20">Create a workspace to collaborate with your team</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workspaces.map(ws => (
            <div key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)} className="glass p-5 rounded-2xl cursor-pointer hover:bg-white/5 transition space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{ws.name}</h3>
                <span className="text-xs bg-cyan/20 text-cyan px-2.5 py-1 rounded-full">{ws.role || 'owner'}</span>
              </div>
              {ws.description && <p className="text-sm text-white/40">{ws.description}</p>}
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>{ws.memberCount || 1} member{(ws.memberCount || 1) !== 1 ? 's' : ''}</span>
                <span>Created {new Date(ws.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
