import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFile, FiFolder, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { FileItem } from '../../types';
import { filesApi } from '../../services/api';

interface FileTreeProps {
  currentFileId: string;
  folderId: string | null;
}

export default function FileTree({ currentFileId, folderId }: FileTreeProps) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const parentId = folderId || undefined;
    filesApi.list({ folderId: parentId }).then(list => {
      const f = list.filter((x: FileItem) => !x.isFolder);
      const d = list.filter((x: FileItem) => x.isFolder);
      f.sort((a: FileItem, b: FileItem) => a.originalName.localeCompare(b.originalName));
      d.sort((a: FileItem, b: FileItem) => a.originalName.localeCompare(b.originalName));
      setFiles(f);
      setFolders(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [folderId]);

  const isTextFile = (file: FileItem) => {
    if (file.isFolder) return false;
    const textExts = /\.(js|ts|jsx|tsx|html|css|scss|less|py|rb|go|rs|java|cpp|c|cs|php|md|json|xml|yaml|yml|sql|sh|bash|env|gitignore|svg|toml|ini|cfg|vue|svelte|tf)$/i;
    return file.mimeType?.startsWith('text/') || textExts.test(file.name);
  };

  if (loading) {
    return (
      <div className="py-2 px-1">
        <div className="h-4 bg-white/5 rounded animate-pulse mb-1" />
        <div className="h-4 bg-white/5 rounded animate-pulse mb-1 w-3/4" />
      </div>
    );
  }

  return (
    <div className="py-1">
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 px-2 py-1 text-[11px] text-white/40 hover:text-white/70 transition-colors w-full text-left">
        {collapsed ? <FiChevronRight size={10} /> : <FiChevronDown size={10} />}
        <FiFolder size={12} />
        <span className="font-medium ml-1">Files</span>
        <span className="text-white/20 ml-auto">{files.length}</span>
      </button>
      {!collapsed && (
        <div className="ml-1">
          {folders.map(f => (
            <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/30 rounded-lg">
              <FiFolder size={12} className="text-cyan/40" />
              <span className="truncate">{f.originalName}</span>
            </div>
          ))}
          {files.map(f => {
            const active = f.id === currentFileId;
            const editable = isTextFile(f);
            return (
              <button key={f.id}
                onClick={() => editable && navigate(`/editor/${f.id}`)}
                disabled={!editable}
                className={`flex items-center gap-1.5 w-full px-2 py-1 rounded-lg text-xs transition-colors ${
                  active ? 'bg-cyan/10 text-cyan' : editable ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-white/20 cursor-default'
                }`}>
                <FiFile size={11} className="flex-shrink-0" />
                <span className="truncate">{f.originalName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
