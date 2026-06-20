import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFile, FiHardDrive, FiActivity, FiFileText,
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiChevronLeft, FiChevronRight,
  FiRefreshCw, FiServer, FiDatabase, FiCpu, FiClock, FiMonitor,
  FiCheckCircle, FiAlertCircle, FiSave, FiUserCheck, FiUserX,
  FiArrowUp, FiArrowDown, FiFolder,
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  AdminStats, AdminUserListResponse, UserPublic, FileItem,
  SystemHealth, AdminSettings, ActivityLogEntry,
} from '../types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

const PIE_COLORS = ['#00E5FF', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#6B7280'];

const tabs = [
  { id: 'overview', label: 'Overview', icon: FiMonitor },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'files', label: 'Files', icon: FiFile },
  { id: 'documents', label: 'Documents', icon: FiFileText },
  { id: 'settings', label: 'Settings', icon: FiServer },
  { id: 'security', label: 'Security', icon: FiActivity },
  { id: 'health', label: 'Health', icon: FiCpu },
];

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-xl glass hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
      >
        <FiChevronLeft size={16} />
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} className="px-3 py-1.5 rounded-xl text-sm text-white/40 hover:text-white glass hover:bg-white/5">
            1
          </button>
          {start > 2 && <span className="text-white/20 px-1">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
            p === page
              ? 'bg-cyan/20 text-cyan'
              : 'text-white/40 hover:text-white glass hover:bg-white/5'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-white/20 px-1">...</span>}
          <button onClick={() => onChange(totalPages)} className="px-3 py-1.5 rounded-xl text-sm text-white/40 hover:text-white glass hover:bg-white/5">
            {totalPages}
          </button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-xl glass hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white/60"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}

interface DeleteConfirmProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function DeleteConfirmModal({ title, message, onConfirm, onCancel, loading }: DeleteConfirmProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 w-full max-w-sm text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
          <FiTrash2 size={24} className="text-coral" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-semibold disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState<UserPublic[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersAdminFilter, setUsersAdminFilter] = useState(false);
  const [usersSortBy, setUsersSortBy] = useState('createdAt');
  const [usersSortOrder, setUsersSortOrder] = useState<'asc' | 'desc'>('desc');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [filesTotal, setFilesTotal] = useState(0);
  const [filesPage, setFilesPage] = useState(1);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesSearch, setFilesSearch] = useState('');
  const [filesTypeFilter, setFilesTypeFilter] = useState('');
  const [filesUserId, setFilesUserId] = useState('');

  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsTotal, setDocumentsTotal] = useState(0);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsSearch, setDocumentsSearch] = useState('');

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logAction, setLogAction] = useState('');
  const [logUserSearch, setLogUserSearch] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);
  const [userForm, setUserForm] = useState({
    username: '', email: '', displayName: '', password: '',
    storageQuotaBytes: 1073741824, isAdmin: false,
  });
  const [userFormLoading, setUserFormLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'user' | 'file' | 'document';
    id: string;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [transferFile, setTransferFile] = useState<FileItem | null>(null);
  const [transferUserId, setTransferUserId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserPublic[]>([]);

  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminApi.stats();
      setStats(data);
    } catch {
      toast.error('Failed to load stats');
    }
    setStatsLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await adminApi.users({
        page: usersPage, limit: 10,
        search: usersSearch || undefined,
        isAdmin: usersAdminFilter || undefined,
        sortBy: usersSortBy, sortOrder: usersSortOrder,
      });
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch {
      toast.error('Failed to load users');
    }
    setUsersLoading(false);
  }, [usersPage, usersSearch, usersAdminFilter, usersSortBy, usersSortOrder]);

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await adminApi.users({ page: 1, limit: 1000 });
      setAllUsers(data.users);
    } catch {}
  }, []);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const data = await adminApi.files({
        page: filesPage, limit: 10,
        search: filesSearch || undefined,
        type: filesTypeFilter || undefined,
        userId: filesUserId || undefined,
      });
      setFiles(data.files);
      setFilesTotal(data.total);
    } catch {
      toast.error('Failed to load files');
    }
    setFilesLoading(false);
  }, [filesPage, filesSearch, filesTypeFilter, filesUserId]);

  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const data = await adminApi.documents({
        page: documentsPage, limit: 10,
        search: documentsSearch || undefined,
      });
      setDocuments(data.documents);
      setDocumentsTotal(data.total);
    } catch {
      toast.error('Failed to load documents');
    }
    setDocumentsLoading(false);
  }, [documentsPage, documentsSearch]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await adminApi.settings();
      setSettings(data);
    } catch {
      toast.error('Failed to load settings');
    }
    setSettingsLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await adminApi.logs({
        page: logsPage, limit: 15,
        action: logAction || undefined,
        search: logUserSearch || undefined,
        startDate: logStartDate || undefined,
        endDate: logEndDate || undefined,
      });
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch {
      toast.error('Failed to load logs');
    }
    setLogsLoading(false);
  }, [logsPage, logAction, logUserSearch, logStartDate, logEndDate]);

  const loadHealth = useCallback(async () => {
    try {
      const data = await adminApi.health();
      setHealth(data);
    } catch {
      toast.error('Failed to load health');
    }
    setHealthLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadHealth(); }, [loadHealth]);

  useEffect(() => {
    if (transferFile) loadAllUsers();
  }, [transferFile, loadAllUsers]);

  useEffect(() => {
    if (activeTab === 'health') {
      loadHealth();
      healthIntervalRef.current = setInterval(loadHealth, 30000);
    }
    return () => {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    };
  }, [activeTab, loadHealth]);

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) {
      toast.error('Username, email, and password are required');
      return;
    }
    setUserFormLoading(true);
    try {
      await adminApi.createUser({
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        displayName: userForm.displayName || undefined,
        storageQuotaBytes: userForm.storageQuotaBytes,
        isAdmin: userForm.isAdmin,
      });
      toast.success('User created');
      setShowUserModal(false);
      resetUserForm();
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
    setUserFormLoading(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setUserFormLoading(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        username: userForm.username || undefined,
        email: userForm.email || undefined,
        displayName: userForm.displayName || undefined,
        password: userForm.password || undefined,
        storageQuotaBytes: userForm.storageQuotaBytes,
        isAdmin: userForm.isAdmin,
      });
      toast.success('User updated');
      setShowUserModal(false);
      setEditingUser(null);
      resetUserForm();
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
    setUserFormLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      if (deleteConfirm.type === 'user') {
        await adminApi.deleteUser(deleteConfirm.id);
        toast.success('User deleted');
        loadUsers();
      } else if (deleteConfirm.type === 'file') {
        await adminApi.deleteFile(deleteConfirm.id);
        toast.success('File deleted');
        loadFiles();
      } else if (deleteConfirm.type === 'document') {
        await adminApi.deleteDocument(deleteConfirm.id);
        toast.success('Document deleted');
        loadDocuments();
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
    setDeleteLoading(false);
  };

  const handleTransferFile = async () => {
    if (!transferFile || !transferUserId) return;
    setTransferLoading(true);
    try {
      await adminApi.transferFile(transferFile.id, transferUserId);
      toast.success('File transferred');
      setTransferFile(null);
      setTransferUserId('');
      loadFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to transfer file');
    }
    setTransferLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      const res = await adminApi.updateSettings({
        CORS_ORIGIN: settings.CORS_ORIGIN,
        MAX_FILE_SIZE: settings.MAX_FILE_SIZE,
        MAX_FILE_VERSIONS: settings.MAX_FILE_VERSIONS,
        ENABLE_2FA: settings.ENABLE_2FA,
        ENABLE_WEBDAV: settings.ENABLE_WEBDAV,
        ENABLE_FULLTEXT_SEARCH: settings.ENABLE_FULLTEXT_SEARCH,
      });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    }
    setSettingsSaving(false);
  };

  const resetUserForm = () => {
    setUserForm({
      username: '', email: '', displayName: '', password: '',
      storageQuotaBytes: 1073741824, isAdmin: false,
    });
  };

  const openEditUser = (user: UserPublic) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      password: '',
      storageQuotaBytes: user.storageQuotaBytes,
      isAdmin: user.isAdmin,
    });
    setShowUserModal(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    resetUserForm();
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    resetUserForm();
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: FiUsers, color: 'text-cyan' },
    { label: 'Total Files', value: (stats.totalFiles + stats.totalFolders).toLocaleString(), icon: FiFile, color: 'text-purple' },
    { label: 'Storage Used', value: formatBytes(stats.totalStorage), icon: FiHardDrive, color: 'text-pink' },
    { label: 'Active Now', value: stats.activeUsers24h.toLocaleString(), icon: FiActivity, color: 'text-green' },
    { label: 'Documents', value: stats.totalDocuments.toLocaleString(), icon: FiFileText, color: 'text-yellow' },
  ] : [];

  const sortedStorageByType = stats ? [...stats.storageByType].sort((a, b) => b.totalSize - a.totalSize) : [];
  const pieData = sortedStorageByType.slice(0, 5).map(s => ({
    name: s.mimeType.split('/')[1]?.toUpperCase() || s.mimeType,
    value: s.totalSize,
  }));
  const otherSize = sortedStorageByType.slice(5).reduce((sum, s) => sum + s.totalSize, 0);
  if (otherSize > 0) pieData.push({ name: 'Other', value: otherSize });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <FiAlertCircle className="mx-auto mb-4 text-coral" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-white/40">You do not have administrator access.</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key="overview"
            className="space-y-6"
          >
            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="h-4 rounded shimmer w-1/2" />
                    <div className="h-8 rounded shimmer w-3/4" />
                    <div className="h-3 rounded shimmer w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    variants={itemVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="glass-card rounded-2xl p-5 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-white/40">{card.label}</span>
                      <card.icon className={card.color} size={20} />
                    </div>
                    <div className="text-2xl font-bold text-white">{card.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Storage by Type</h3>
                {pieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-white/30">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => formatBytes(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Users</h3>
                {!stats || stats.topUsers.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-white/30">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.topUsers.map(u => ({ name: u.username, storage: u.usedStorageBytes }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickFormatter={(v: any) => formatBytes(Number(v))} />
                      <Tooltip
                        contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                        formatter={(value: any) => formatBytes(Number(value))}
                      />
                      <Bar dataKey="storage" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Storage Growth (30 days)</h3>
              {!stats || stats.storageGrowth.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-white/30">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.storageGrowth}>
                    <defs>
                      <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickFormatter={(v: any) => formatBytes(Number(v))} />
                    <Tooltip
                      contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => formatBytes(Number(value))}
                    />
                    <Area type="monotone" dataKey="total" stroke="#00E5FF" fillOpacity={1} fill="url(#colorStorage)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </motion.div>
        );

      case 'users':
        return (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input
                    value={usersSearch}
                    onChange={e => { setUsersSearch(e.target.value); setUsersPage(1); }}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <button
                  onClick={() => { setUsersAdminFilter(!usersAdminFilter); setUsersPage(1); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    usersAdminFilter ? 'glass text-cyan' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {usersAdminFilter ? <FiUserCheck size={14} /> : <FiUserX size={14} />}
                  Admins
                </button>
                <button
                  onClick={() => {
                    setUsersSortBy('createdAt');
                    setUsersSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1"
                >
                  Date {usersSortOrder === 'asc' ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                </button>
              </div>
              <button onClick={openCreateUser} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm flex items-center gap-1.5">
                <FiPlus size={16} />
                Add User
              </button>
            </div>

            {usersLoading ? (
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded shimmer w-1/4" />
                      <div className="h-3 rounded shimmer w-1/3" />
                    </div>
                    <div className="h-8 w-20 rounded-xl shimmer" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FiUsers className="mx-auto mb-3 text-white/20" size={48} />
                <p className="text-lg font-medium text-white/60">No users found</p>
                <p className="text-sm text-white/30 mt-1">
                  {usersSearch ? 'Try a different search term' : 'Click "Add User" to create one'}
                </p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                        <th className="text-left p-4 font-medium">Username</th>
                        <th className="text-left p-4 font-medium">Email</th>
                        <th className="text-left p-4 font-medium">Display Name</th>
                        <th className="text-left p-4 font-medium">Role</th>
                        <th className="text-left p-4 font-medium">Storage</th>
                        <th className="text-left p-4 font-medium">Created</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-white font-medium">{user.username}</td>
                          <td className="p-4 text-white/60">{user.email}</td>
                          <td className="p-4 text-white/60">{user.displayName || '—'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                              user.isAdmin ? 'bg-cyan/10 text-cyan' : 'bg-white/5 text-white/40'
                            }`}>
                              {user.isAdmin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="p-4 text-white/60 text-xs">
                            {formatBytes(user.usedStorageBytes)} / {formatBytes(user.storageQuotaBytes)}
                          </td>
                          <td className="p-4 text-white/40 text-xs">{formatDate(user.createdAt)}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditUser(user)}
                                className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
                                title="Edit user"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ type: 'user', id: user.id, name: user.username })}
                                className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-coral transition-colors"
                                title="Delete user"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Pagination page={usersPage} total={usersTotal} limit={10} onChange={setUsersPage} />
          </motion.div>
        );

      case 'files':
        return (
          <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input
                  value={filesSearch}
                  onChange={e => { setFilesSearch(e.target.value); setFilesPage(1); }}
                  placeholder="Search files..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'All', value: '' },
                  { label: 'Files', value: 'file' },
                  { label: 'Folders', value: 'folder' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilesTypeFilter(opt.value); setFilesPage(1); }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      filesTypeFilter === opt.value
                        ? 'glass text-cyan'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                value={filesUserId}
                onChange={e => { setFilesUserId(e.target.value); setFilesPage(1); }}
                className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
              >
                <option value="">All Owners</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>

            {filesLoading ? (
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded shimmer w-1/3" />
                      <div className="h-3 rounded shimmer w-1/4" />
                    </div>
                    <div className="h-8 w-20 rounded-xl shimmer" />
                  </div>
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FiFile className="mx-auto mb-3 text-white/20" size={48} />
                <p className="text-lg font-medium text-white/60">No files found</p>
                <p className="text-sm text-white/30 mt-1">
                  {filesSearch ? 'Try a different search term' : 'No files in the system yet'}
                </p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">Size</th>
                        <th className="text-left p-4 font-medium">Owner</th>
                        <th className="text-left p-4 font-medium">Created</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {files.map(file => {
                        const owner = allUsers.find(u => u.id === file.userId);
                        return (
                          <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 text-white font-medium truncate max-w-[200px]">
                              <div className="flex items-center gap-2">
                                {file.isFolder ? <FiFolder className="text-yellow shrink-0" size={14} /> : <FiFile className="text-cyan shrink-0" size={14} />}
                                <span className="truncate">{file.originalName || file.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-white/40 text-xs">
                              {file.isFolder ? 'Folder' : (file.mimeType || 'Unknown')}
                            </td>
                            <td className="p-4 text-white/60 text-xs">{file.isFolder ? '—' : formatBytes(file.size)}</td>
                            <td className="p-4 text-white/60 text-xs">{owner?.username || file.userId.slice(0, 8)}</td>
                            <td className="p-4 text-white/40 text-xs">{formatDate(file.createdAt)}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setTransferFile(file);
                                    setTransferUserId('');
                                  }}
                                  className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
                                  title="Transfer ownership"
                                >
                                  <FiUsers size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'file', id: file.id, name: file.originalName || file.name })}
                                  className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-coral transition-colors"
                                  title="Delete file"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Pagination page={filesPage} total={filesTotal} limit={10} onChange={setFilesPage} />
          </motion.div>
        );

      case 'documents':
        return (
          <motion.div key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="relative max-w-xs">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                value={documentsSearch}
                onChange={e => { setDocumentsSearch(e.target.value); setDocumentsPage(1); }}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
              />
            </div>

            {documentsLoading ? (
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded shimmer w-1/3" />
                      <div className="h-3 rounded shimmer w-1/4" />
                    </div>
                    <div className="h-8 w-20 rounded-xl shimmer" />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FiFileText className="mx-auto mb-3 text-white/20" size={48} />
                <p className="text-lg font-medium text-white/60">No documents found</p>
                <p className="text-sm text-white/30 mt-1">
                  {documentsSearch ? 'Try a different search term' : 'No documents in the system yet'}
                </p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Owner</th>
                        <th className="text-left p-4 font-medium">Word Count</th>
                        <th className="text-left p-4 font-medium">Version</th>
                        <th className="text-left p-4 font-medium">Created</th>
                        <th className="text-left p-4 font-medium">Updated</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {documents.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-white font-medium truncate max-w-[200px]">{doc.name}</td>
                          <td className="p-4 text-white/60 text-xs">
                            {doc.ownerId ? (allUsers.find(u => u.id === doc.ownerId)?.username || doc.ownerId.slice(0, 8)) : '—'}
                          </td>
                          <td className="p-4 text-white/60 text-xs">{(doc.wordCount ?? 0).toLocaleString()}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white/40 text-xs">{doc.version ?? 1}</span>
                          </td>
                          <td className="p-4 text-white/40 text-xs">{formatDate(doc.createdAt)}</td>
                          <td className="p-4 text-white/40 text-xs">{formatDate(doc.updatedAt)}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setDeleteConfirm({ type: 'document', id: doc.id, name: doc.name })}
                              className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-coral transition-colors"
                              title="Delete document"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Pagination page={documentsPage} total={documentsTotal} limit={10} onChange={setDocumentsPage} />
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
            {settingsLoading ? (
              <div className="glass-card rounded-2xl p-6 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 rounded shimmer w-1/4" />
                    <div className="h-10 rounded-xl shimmer w-full" />
                  </div>
                ))}
              </div>
            ) : settings ? (
              <>
                <div className="glass-card rounded-2xl p-6 space-y-5">
                  <h3 className="text-lg font-semibold text-white">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-1.5">CORS Origin</label>
                      <input
                        value={settings.CORS_ORIGIN}
                        onChange={e => setSettings({ ...settings, CORS_ORIGIN: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1.5">Max File Size (bytes)</label>
                      <input
                        type="number"
                        value={settings.MAX_FILE_SIZE}
                        onChange={e => setSettings({ ...settings, MAX_FILE_SIZE: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1.5">Max File Versions</label>
                      <input
                        type="number"
                        value={settings.MAX_FILE_VERSIONS}
                        onChange={e => setSettings({ ...settings, MAX_FILE_VERSIONS: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-5">
                  <h3 className="text-lg font-semibold text-white">Feature Toggles</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'ENABLE_2FA', label: 'Enable Two-Factor Authentication' },
                      { key: 'ENABLE_WEBDAV', label: 'Enable WebDAV' },
                      { key: 'ENABLE_FULLTEXT_SEARCH', label: 'Enable Full-Text Search' },
                    ].map(feature => (
                      <div key={feature.key} className="flex items-center justify-between">
                        <span className="text-sm text-white/80">{feature.label}</span>
                        <button
                          onClick={() => setSettings({
                            ...settings,
                            [feature.key]: settings[feature.key as keyof typeof settings] === 'true' ? 'false' : 'true',
                          })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            settings[feature.key as keyof typeof settings] === 'true' ? 'bg-cyan' : 'bg-white/10'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                            settings[feature.key as keyof typeof settings] === 'true' ? 'left-[26px]' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-3">
                  <h3 className="text-lg font-semibold text-white">System Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-white/40 mb-1">Node Version</div>
                      <div className="text-sm text-white font-medium">{settings.nodeVersion || '—'}</div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-white/40 mb-1">Platform</div>
                      <div className="text-sm text-white font-medium">{settings.platform || '—'}</div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="text-xs text-white/40 mb-1">Uptime</div>
                      <div className="text-sm text-white font-medium">{formatUptime(settings.uptime || 0)}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <FiSave size={16} />
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            ) : null}
          </motion.div>
        );

      case 'security':
        return (
          <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div>
                <label className="block text-xs text-white/40 mb-1">Action</label>
                <select
                  value={logAction}
                  onChange={e => { setLogAction(e.target.value); setLogsPage(1); }}
                  className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
                >
                  <option value="">All Actions</option>
                  {['upload', 'download', 'delete', 'restore', 'rename', 'move', 'create', 'share_create', 'share_access', 'login', 'permanent_delete'].map(a => (
                    <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">User</label>
                <input
                  value={logUserSearch}
                  onChange={e => { setLogUserSearch(e.target.value); setLogsPage(1); }}
                  placeholder="Username or email..."
                  className="px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Start Date</label>
                <input
                  type="date"
                  value={logStartDate}
                  onChange={e => { setLogStartDate(e.target.value); setLogsPage(1); }}
                  className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">End Date</label>
                <input
                  type="date"
                  value={logEndDate}
                  onChange={e => { setLogEndDate(e.target.value); setLogsPage(1); }}
                  className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
                />
              </div>
            </div>

            {logsLoading ? (
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="h-4 rounded shimmer w-1/2" />
                    <div className="h-3 rounded shimmer w-1/3" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FiActivity className="mx-auto mb-3 text-white/20" size={48} />
                <p className="text-lg font-medium text-white/60">No log entries found</p>
                <p className="text-sm text-white/30 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                        <th className="text-left p-4 font-medium">Action</th>
                        <th className="text-left p-4 font-medium">User</th>
                        <th className="text-left p-4 font-medium">Item</th>
                        <th className="text-left p-4 font-medium">IP Address</th>
                        <th className="text-left p-4 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium capitalize bg-white/5 text-white/60">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-white/60 text-xs">{log.userId || '—'}</td>
                          <td className="p-4 text-white text-xs truncate max-w-[200px]">{log.itemName || '—'}</td>
                          <td className="p-4 text-white/40 text-xs font-mono">{log.ipAddress || '—'}</td>
                          <td className="p-4 text-white/40 text-xs">{formatDateTime(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Pagination page={logsPage} total={logsTotal} limit={15} onChange={setLogsPage} />
          </motion.div>
        );

      case 'health':
        return (
          <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">System Health</h3>
              <button
                onClick={() => { setHealthLoading(true); loadHealth(); }}
                className="p-2 rounded-xl glass hover:bg-white/5 text-cyan transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={16} className={healthLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {healthLoading && !health ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
                    <div className="h-4 rounded shimmer w-1/3" />
                    <div className="h-6 rounded shimmer w-1/2" />
                    <div className="h-3 rounded shimmer w-2/3" />
                  </div>
                ))}
              </div>
            ) : health ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <FiDatabase className="text-cyan" size={16} />
                      Database
                    </span>
                    {health.database.connected ? (
                      <FiCheckCircle className="text-green" size={18} />
                    ) : (
                      <FiAlertCircle className="text-coral" size={18} />
                    )}
                  </div>
                  <div className="text-lg font-bold text-white mb-1">
                    {health.database.connected ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="text-xs text-white/40">
                    Latency: {health.database.latencyMs.toFixed(1)}ms
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <FiHardDrive className="text-purple" size={16} />
                      Disk
                    </span>
                    <FiServer className="text-white/20" size={16} />
                  </div>
                  <div className="text-lg font-bold text-white mb-2">
                    {formatBytes(health.disk.free)} free
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        health.disk.usedPercent > 90 ? 'bg-coral' : health.disk.usedPercent > 70 ? 'bg-yellow' : 'bg-cyan'
                      }`}
                      style={{ width: `${health.disk.usedPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/40">
                    {formatBytes(health.disk.total - health.disk.free)} used of {formatBytes(health.disk.total)} ({health.disk.usedPercent.toFixed(1)}%)
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <FiMonitor className="text-pink" size={16} />
                      Memory
                    </span>
                    <FiServer className="text-white/20" size={16} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">RSS</span>
                      <span className="text-white font-medium">{formatBytes(health.memory.rss)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Heap</span>
                      <span className="text-white font-medium">{formatBytes(health.memory.heapUsed)} / {formatBytes(health.memory.heapTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">External</span>
                      <span className="text-white font-medium">{formatBytes(health.memory.external)}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <FiCpu className="text-yellow" size={16} />
                      CPU
                    </span>
                    <FiServer className="text-white/20" size={16} />
                  </div>
                  <div className="space-y-2">
                    {health.cpu.loadAvg.map((load, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Load ({(idx + 1) * 1}m)</span>
                        <span className="text-white font-medium">{load.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <FiClock className="text-green" size={16} />
                      Uptime
                    </span>
                    <FiServer className="text-white/20" size={16} />
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{formatUptime(health.uptime)}</div>
                  <div className="text-xs text-white/40">System running since last restart</div>
                </motion.div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center">
                <FiServer className="mx-auto mb-3 text-white/20" size={48} />
                <p className="text-lg font-medium text-white/60">Health data unavailable</p>
                <p className="text-sm text-white/30 mt-1">The health endpoint may not be reachable</p>
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient">Admin Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Manage users, files, and system settings</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'glass text-cyan'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>

      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeUserModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {editingUser ? 'Edit User' : 'Create User'}
                </h3>
                <button onClick={closeUserModal} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                  <FiX size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Username *</label>
                  <input
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Display Name</label>
                  <input
                    value={userForm.displayName}
                    onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    Password {editingUser && <span className="text-white/30 font-normal">(leave blank to keep current)</span>}
                    {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Storage Quota (bytes)</label>
                  <input
                    type="number"
                    value={userForm.storageQuotaBytes}
                    onChange={e => setUserForm({ ...userForm, storageQuotaBytes: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                  <p className="text-xs text-white/30 mt-1">{formatBytes(userForm.storageQuotaBytes)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Administrator</span>
                  <button
                    onClick={() => setUserForm({ ...userForm, isAdmin: !userForm.isAdmin })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      userForm.isAdmin ? 'bg-cyan' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${
                      userForm.isAdmin ? 'left-[26px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    disabled={userFormLoading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm disabled:opacity-50"
                  >
                    {userFormLoading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                  </button>
                  <button onClick={closeUserModal} className="px-4 py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transferFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setTransferFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Transfer File Ownership</h3>
              <p className="text-sm text-white/60 mb-4">
                Transfer "{transferFile.originalName || transferFile.name}" to:
              </p>
              <select
                value={transferUserId}
                onChange={e => setTransferUserId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors mb-4"
              >
                <option value="">Select a user...</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleTransferFile}
                  disabled={!transferUserId || transferLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm disabled:opacity-50"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer'}
                </button>
                <button onClick={() => setTransferFile(null)} className="flex-1 py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <DeleteConfirmModal
            title={`Delete ${deleteConfirm.type}`}
            message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
