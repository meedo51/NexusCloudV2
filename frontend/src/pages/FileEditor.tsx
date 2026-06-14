import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSave, FiFile, FiDownload, FiTrash2, FiClock, FiEdit3,
  FiType, FiBold, FiItalic, FiList, FiCode, FiMinimize2, FiMaximize2,
  FiChevronLeft,
} from 'react-icons/fi';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import toast from 'react-hot-toast';

export default function FileEditor() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(!!fileId);
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isNew, setIsNew] = useState(!fileId);
  const [newName, setNewName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (fileId) {
      setIsNew(false);
      filesApi.getContent(fileId).then(res => {
        setContent(res.content);
        setFileName(res.name);
        setWordCount(res.content.split(/\s+/).filter(Boolean).length);
        document.title = `Editing: ${res.name} - NexusCloud`;
      }).catch(() => {
        toast.error('Failed to load file');
        navigate(-1);
      }).finally(() => setLoading(false));
    }
  }, [fileId, navigate]);

  useEffect(() => {
    setWordCount(content.split(/\s+/).filter(Boolean).length);
  }, [content]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [content, fileId, isNew, newName]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (isNew) {
        const name = newName.trim() || 'untitled.txt';
        const created = await filesApi.createFile(name, content);
        toast.success('File created');
        navigate(`/editor/${created.id}`, { replace: true });
        setIsNew(false);
        setFileName(created.originalName);
        setNewName('');
      } else if (fileId) {
        await filesApi.saveContent(fileId, content);
        toast.success('Saved');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  }, [content, fileId, isNew, newName, navigate]);

  const handleDownload = async () => {
    if (!fileId) return;
    try {
      const blob = await filesApi.download(fileId);
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

  const insertText = (before: string, after = '') => {
    setContent(prev => {
      const sel = document.getSelection();
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = prev.substring(start, end);
        return prev.substring(0, start) + before + selected + after + prev.substring(end);
      }
      return prev + before;
    });
  };

  const languageName = (name: string) => {
    if (!name) return 'Plain Text';
    const ext = name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: 'JavaScript', ts: 'TypeScript', jsx: 'React JSX', tsx: 'React TSX',
      py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
      c: 'C', cpp: 'C++', cs: 'C#', php: 'PHP', swift: 'Swift',
      html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
      json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML',
      md: 'Markdown', sql: 'SQL', sh: 'Shell', bash: 'Bash',
      txt: 'Plain Text',
    };
    return map[ext || ''] || 'Plain Text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-xl bg-cyan/20 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-40 bg-space p-4' : ''}`}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl glass hover:bg-white/5 text-cyan">
            <FiChevronLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center flex-shrink-0">
            <FiEdit3 size={20} className="text-cyan" />
          </div>
          <div className="min-w-0">
            {isNew ? (
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="filename.ext"
                className="bg-white/5 rounded px-2 py-1 text-base font-semibold outline-none border border-cyan/30 w-48"
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold truncate">{fileName || 'untitled'}</h2>
                <p className="text-xs text-white/40">{languageName(fileName)} &middot; {wordCount} words</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl glass hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
          {!isNew && (
            <button onClick={handleDownload} className="p-2 rounded-xl glass hover:bg-white/5 text-white/40 hover:text-cyan transition-colors" title="Download">
              <FiDownload size={16} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FiSave size={14} />
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-3 flex-wrap flex-shrink-0">
        {[
          { icon: FiType, label: 'Bold', action: () => insertText('**', '**') },
          { icon: FiItalic, label: 'Italic', action: () => insertText('*', '*') },
          { icon: FiList, label: 'List', action: () => insertText('\n- ') },
          { icon: FiCode, label: 'Code', action: () => insertText('`', '`') },
        ].map(tool => (
          <button
            key={tool.label}
            onClick={tool.action}
            className="p-2 rounded-xl glass hover:bg-white/5 text-white/40 hover:text-cyan transition-colors"
            title={tool.label}
          >
            <tool.icon size={14} />
          </button>
        ))}
        <span className="text-xs text-white/20 ml-auto hidden sm:block">
          <FiClock className="inline mr-1" size={12} />
          {wordCount} words &middot; {content.length} chars
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); }}
          placeholder={isNew ? 'Start writing your file content...' : ''}
          className="w-full h-full min-h-[400px] p-5 rounded-2xl glass text-sm font-mono text-white/90 placeholder-white/15 outline-none resize-none leading-relaxed focus:border-cyan/20 transition-colors"
          spellCheck={false}
        />
      </div>
    </motion.div>
  );
}
