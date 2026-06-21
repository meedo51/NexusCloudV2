import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile, FiFileText, FiImage, FiCode, FiVideo, FiMusic, FiArchive,
  FiSearch, FiPlus, FiX, FiCheck, FiToggleLeft, FiToggleRight,
  FiRefreshCw, FiTrash2, FiSave, FiSliders, FiFilter, FiChevronDown,
  FiChevronRight, FiLayers, FiBold, FiType,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';
import type { FileTypeConfig } from '../types';

const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
  document: { label: 'Documents', icon: FiFileText, color: 'text-cyan' },
  image: { label: 'Images', icon: FiImage, color: 'text-purple' },
  code: { label: 'Code', icon: FiCode, color: 'text-green' },
  video: { label: 'Video', icon: FiVideo, color: 'text-pink' },
  audio: { label: 'Audio', icon: FiMusic, color: 'text-yellow' },
  archive: { label: 'Archives', icon: FiArchive, color: 'text-orange' },
  data: { label: 'Data', icon: FiLayers, color: 'text-blue' },
  other: { label: 'Other', icon: FiType, color: 'text-white/40' },
};

const presetOptions = [
  { id: 'all', label: 'Enable All', icon: FiToggleRight },
  { id: 'none', label: 'Disable All', icon: FiToggleLeft },
  { id: 'documents', label: 'Documents Only', icon: FiFileText },
  { id: 'code', label: 'Code Files', icon: FiCode },
  { id: 'media', label: 'Media Files', icon: FiVideo },
  { id: 'archives', label: 'Archives Only', icon: FiArchive },
];

const categoryKeys = ['document', 'image', 'code', 'video', 'audio', 'archive', 'data', 'other'];

function iconForExt(ext: string): string {
  const img = ['jpg','jpeg','png','gif','bmp','svg','webp','ico','tiff','tif'];
  const doc = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','rtf','odt','csv'];
  const code = ['js','ts','jsx','tsx','py','java','cpp','c','h','rs','go','rb','php','html','css','scss','json','xml','yaml','yml','toml','sh','bash','sql'];
  const vid = ['mp4','avi','mkv','mov','wmv','flv','webm'];
  const aud = ['mp3','wav','ogg','flac','aac','wma','m4a'];
  const arc = ['zip','rar','tar','gz','7z','bz2'];
  if (img.includes(ext)) return 'FiImage';
  if (doc.includes(ext)) return 'FiFileText';
  if (code.includes(ext)) return 'FiCode';
  if (vid.includes(ext)) return 'FiVideo';
  if (aud.includes(ext)) return 'FiMusic';
  if (arc.includes(ext)) return 'FiArchive';
  return 'FiFile';
}

function FileIcon({ icon, size = 16, className = '' }: { icon: string; size?: number; className?: string }) {
  const icons: Record<string, any> = { FiFile, FiFileText, FiImage, FiCode, FiVideo, FiMusic, FiArchive, FiLayers, FiType };
  const Comp = icons[icon] || FiFile;
  return <Comp size={size} className={className} />;
}

export default function FileTypeManager() {
  const [types, setTypes] = useState<FileTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    categoryKeys.forEach(k => { init[k] = true; });
    return init;
  });
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Custom extension modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ extension: '', mimeType: '', name: '', category: 'other' });
  const [customSaving, setCustomSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<FileTypeConfig | null>(null);

  // Category bulk toggle
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState(true);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.fileTypes();
      setTypes(data);
    } catch {
      toast.error('Failed to load file types');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  const filtered = useMemo(() => {
    return types.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.extension.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.mimeType.toLowerCase().includes(q)) return false;
      }
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterStatus === 'enabled' && !t.enabled) return false;
      if (filterStatus === 'disabled' && t.enabled) return false;
      return true;
    });
  }, [types, search, filterCategory, filterStatus]);

  const grouped = useMemo(() => {
    const groups: Record<string, FileTypeConfig[]> = {};
    categoryKeys.forEach(k => { groups[k] = []; });
    for (const t of filtered) {
      if (groups[t.category]) groups[t.category].push(t);
      else groups[t.category] = [t];
    }
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = types.length;
    const enabled = types.filter(t => t.enabled).length;
    const disabled = total - enabled;
    const custom = types.filter(t => t.isCustom).length;
    return { total, enabled, disabled, custom };
  }, [types]);

  const handleToggle = async (item: FileTypeConfig) => {
    setTogglingIds(prev => new Set(prev).add(item.id));
    try {
      const updated = await adminApi.updateFileType(item.id, { enabled: !item.enabled });
      setTypes(prev => prev.map(t => t.id === item.id ? updated : t));
    } catch {
      toast.error('Failed to update');
    }
    setTogglingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
  };

  const handlePreset = async (preset: string) => {
    setApplyingPreset(preset);
    try {
      const data = await adminApi.bulkUpdateFileTypes({ preset });
      setTypes(data);
      toast.success(`Preset "${presetOptions.find(p => p.id === preset)?.label}" applied`);
    } catch {
      toast.error('Failed to apply preset');
    }
    setApplyingPreset(null);
  };

  const handleBulkCategory = async (category: string, enabled: boolean) => {
    setBulkCategory(category);
    try {
      const data = await adminApi.bulkUpdateFileTypes({ category, enabled });
      setTypes(data);
      toast.success(`${categoryMeta[category]?.label || category} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update category');
    }
    setBulkCategory(null);
  };

  const handleAddCustom = async () => {
    if (!customForm.extension || !/^[a-zA-Z0-9]+$/.test(customForm.extension)) {
      toast.error('Extension must be alphanumeric');
      return;
    }
    setCustomSaving(true);
    try {
      const created = await adminApi.createFileType({
        extension: customForm.extension,
        mimeType: customForm.mimeType,
        name: customForm.name || customForm.extension.toUpperCase(),
        category: customForm.category,
      });
      setTypes(prev => [...prev, created]);
      setShowCustomModal(false);
      setCustomForm({ extension: '', mimeType: '', name: '', category: 'other' });
      toast.success('Custom extension added');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add extension');
    }
    setCustomSaving(false);
  };

  const handleDeleteCustom = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteFileType(deleteTarget.id);
      setTypes(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(`Deleted .${deleteTarget.extension}`);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Types', value: stats.total, color: 'text-cyan', icon: FiLayers },
          { label: 'Enabled', value: stats.enabled, color: 'text-green', icon: FiCheck },
          { label: 'Disabled', value: stats.disabled, color: 'text-coral', icon: FiX },
          { label: 'Custom', value: stats.custom, color: 'text-purple', icon: FiPlus },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-2xl p-4 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Presets */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {presetOptions.map(p => (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            disabled={applyingPreset !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
          >
            {applyingPreset === p.id ? (
              <FiRefreshCw size={12} className="animate-spin" />
            ) : (
              <p.icon size={12} />
            )}
            {p.label}
          </button>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search extensions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
        >
          <option value="">All Categories</option>
          {categoryKeys.map(k => (
            <option key={k} value={k}>{categoryMeta[k]?.label || k}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold hover:shadow-lg hover:shadow-cyan/20 transition-all"
        >
          <FiPlus size={15} />
          Add Custom
        </button>
        <button
          onClick={loadTypes}
          className="p-2.5 rounded-xl glass hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
          title="Refresh"
        >
          <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* File Type Cards by Category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="h-5 rounded shimmer w-28" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-14 rounded-xl shimmer" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {categoryKeys.map(cat => {
            const items = grouped[cat] || [];
            const meta = categoryMeta[cat] || { label: cat, icon: FiFile, color: 'text-white/40' };
            const catEnabled = items.filter(t => t.enabled).length;
            if (items.length === 0) return null;
            return (
              <motion.div key={cat} variants={itemVariants} className="glass-card rounded-2xl overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <meta.icon size={18} className={meta.color} />
                    <span className="text-sm font-semibold text-white">{meta.label}</span>
                    <span className="text-xs text-white/30">{items.length} types</span>
                    <span className={`text-xs font-medium ${catEnabled === items.length ? 'text-green' : catEnabled > 0 ? 'text-yellow' : 'text-white/20'}`}>
                      {catEnabled}/{items.length} enabled
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); handleBulkCategory(cat, true); }}
                        disabled={bulkCategory === cat}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium text-green/60 hover:text-green hover:bg-white/5 transition-colors disabled:opacity-30"
                      >
                        {bulkCategory === cat ? '...' : 'Enable All'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleBulkCategory(cat, false); }}
                        disabled={bulkCategory === cat}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium text-coral/60 hover:text-coral hover:bg-white/5 transition-colors disabled:opacity-30"
                      >
                        Disable All
                      </button>
                    </div>
                    <span className="text-white/10">
                      {expandedCategories[cat] ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories[cat] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {items.map(item => {
                          const toggling = togglingIds.has(item.id);
                          return (
                            <motion.div
                              key={item.id}
                              layout
                              whileHover={{ y: -2, scale: 1.02 }}
                              className={`relative group rounded-xl p-3 border transition-all cursor-pointer ${
                                item.enabled
                                  ? 'bg-white/[0.04] border-white/10 hover:border-cyan/30 hover:bg-white/[0.06]'
                                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 opacity-60 hover:opacity-80'
                              }`}
                              onClick={() => handleToggle(item)}
                            >
                              {/* Animated background glow when enabled */}
                              {item.enabled && (
                                <motion.div
                                  layoutId={`glow-${item.id}`}
                                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                />
                              )}

                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileIcon icon={iconForExt(item.extension)} size={14} className={item.enabled ? 'text-cyan' : 'text-white/30'} />
                                  <span className="text-xs font-mono font-medium text-white truncate">.{item.extension}</span>
                                </div>

                                {/* Toggle Switch */}
                                <div className="relative flex-shrink-0">
                                  {toggling ? (
                                    <FiRefreshCw size={12} className="animate-spin text-white/30" />
                                  ) : (
                                    <button
                                      onClick={e => { e.stopPropagation(); handleToggle(item); }}
                                      className={`relative w-8 h-[18px] rounded-full transition-all duration-300 ${
                                        item.enabled ? 'bg-cyan' : 'bg-white/10'
                                      }`}
                                    >
                                      <motion.div
                                        animate={{ x: item.enabled ? 16 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow"
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Extension name tooltip */}
                              <div className="mt-1.5 text-[10px] text-white/30 truncate leading-tight">
                                {item.name || item.extension}
                              </div>

                              {/* Delete custom button */}
                              {item.isCustom && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeleteTarget(item);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-coral/20 text-coral flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral/40"
                                >
                                  <FiX size={8} />
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add Custom Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCustomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FiPlus className="text-cyan" size={18} />
                  Add Custom Extension
                </h3>
                <button onClick={() => setShowCustomModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                  <FiX size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Extension *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-mono text-sm">.</span>
                    <input
                      value={customForm.extension}
                      onChange={e => setCustomForm({ ...customForm, extension: e.target.value.toLowerCase() })}
                      placeholder="e.g. myext"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">MIME Type</label>
                  <input
                    value={customForm.mimeType}
                    onChange={e => setCustomForm({ ...customForm, mimeType: e.target.value })}
                    placeholder="e.g. application/octet-stream"
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Display Name</label>
                  <input
                    value={customForm.name}
                    onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                    placeholder="e.g. My Custom File"
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Category</label>
                  <select
                    value={customForm.category}
                    onChange={e => setCustomForm({ ...customForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white outline-none focus:border-cyan/30 transition-colors"
                  >
                    {categoryKeys.map(k => (
                      <option key={k} value={k}>{categoryMeta[k]?.label || k}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddCustom}
                  disabled={customSaving || !customForm.extension}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {customSaving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                  {customSaving ? 'Adding...' : 'Add Extension'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-sm text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
                <FiTrash2 size={24} className="text-coral" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Delete Extension</h3>
              <p className="text-sm text-white/60 mb-6">
                Are you sure you want to delete <span className="text-white font-mono">.{deleteTarget.extension}</span>?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl glass hover:bg-white/5 text-sm">
                  Cancel
                </button>
                <button onClick={handleDeleteCustom} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-semibold">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
