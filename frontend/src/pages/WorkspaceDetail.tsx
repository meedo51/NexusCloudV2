import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspacesApi } from '../services/api';
import { Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceItem } from '../types';
import toast from 'react-hot-toast';

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'files' | 'settings'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showInvite, setShowInvite] = useState(false);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      workspacesApi.get(id),
      workspacesApi.listItems(id),
    ]).then(([wsData, itemData]) => {
      setWs(wsData);
      setMembers(wsData.members || []);
      setItems(itemData);
    }).catch(() => toast.error('Failed to load workspace')).finally(() => setLoading(false));
  }, [id]);

  const loadInvites = async () => {
    if (!id) return;
    try {
      const data = await workspacesApi.invites(id);
      setInvites(data);
    } catch {}
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    try {
      await workspacesApi.invite(id!, inviteEmail.trim(), inviteRole);
      toast.success('Invitation sent');
      setInviteEmail('');
      setShowInvite(false);
      loadInvites();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to invite');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await workspacesApi.removeMember(id!, memberId);
      setMembers(prev => prev.filter(m => m.userId !== memberId));
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove member');
    }
  };

  const changeRole = async (memberId: string, role: string) => {
    try {
      await workspacesApi.updateMemberRole(id!, memberId, role);
      setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, role: role as any } : m));
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update role');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await workspacesApi.removeItem(id!, itemId);
      setItems(prev => prev.filter(i => i.itemId !== itemId));
      toast.success('Item removed');
    } catch { toast.error('Failed to remove item'); }
  };

  const deleteWorkspace = async () => {
    if (!confirm('Delete this workspace permanently?')) return;
    try {
      await workspacesApi.delete(id!);
      toast.success('Workspace deleted');
      navigate('/workspaces');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const leaveWorkspace = async () => {
    if (!confirm('Leave this workspace?')) return;
    try {
      await workspacesApi.leave(id!);
      toast.success('Left workspace');
      navigate('/workspaces');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to leave');
    }
  };

  if (loading) return <div className="text-center py-12 text-white/30">Loading...</div>;
  if (!ws) return <div className="text-center py-12 text-white/30">Workspace not found</div>;

  const isOwner = ws.ownerId === currentUserId;
  const isAdmin = isOwner || members.some(m => m.userId === currentUserId && m.role === 'admin');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{ws.name}</h1>
          {ws.description && <p className="text-white/50 mt-1">{ws.description}</p>}
        </div>
        <button onClick={() => navigate('/workspaces')} className="text-white/40 hover:text-white text-sm">All Workspaces</button>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-2">
        {['members', 'files', 'settings'].map(t => (
          <button key={t} onClick={() => { setTab(t as any); if (t === 'invites') loadInvites(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${
              tab === t ? 'bg-cyan/20 text-cyan' : 'text-white/50 hover:text-white'
            }`}>{t === 'files' ? 'Files' : t === 'members' ? 'Members' : 'Settings'}</button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Members ({members.length})</h2>
            {isAdmin && (
              <button onClick={() => setShowInvite(!showInvite)} className="px-3 py-1.5 bg-cyan text-dark text-sm rounded-xl hover:bg-cyan/90 transition">
                {showInvite ? 'Cancel' : 'Invite'}
              </button>
            )}
          </div>
          {showInvite && (
            <div className="glass p-4 rounded-2xl space-y-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="User email" className="w-full px-4 py-2 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-4 py-2 rounded-xl glass text-white outline-none focus:border-cyan/30">
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={sendInvite} className="px-4 py-2 bg-cyan text-dark rounded-xl hover:bg-cyan/90 transition">Send Invitation</button>
            </div>
          )}
          {members.map(m => (
            <div key={m.userId} className="glass p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{m.username || m.email || m.userId}</p>
                <p className="text-xs text-white/40">{m.role} · Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && m.userId !== currentUserId && (
                  <>
                    <select value={m.role} onChange={e => changeRole(m.userId, e.target.value)}
                      className="px-2 py-1 rounded-lg glass text-white text-xs outline-none">
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={() => removeMember(m.userId)} className="text-red/60 hover:text-red text-xs">Remove</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Shared Files ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-white/30 py-8 text-center">No files shared in this workspace yet</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="glass p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-cyan/60">{item.isFolder ? '📁' : '📄'}</span>
                  <div>
                    <p className="text-white">{item.originalName || item.name}</p>
                    <p className="text-xs text-white/40">{item.itemType} · Added {new Date(item.addedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => removeItem(item.itemId)} className="text-red/60 hover:text-red text-xs">Remove</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="glass p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-semibold text-white">Workspace Settings</h2>
            {isOwner ? (
              <button onClick={deleteWorkspace} className="px-4 py-2 bg-red/80 text-white rounded-xl hover:bg-red transition">Delete Workspace</button>
            ) : (
              <button onClick={leaveWorkspace} className="px-4 py-2 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition">Leave Workspace</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
