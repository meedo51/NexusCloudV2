import { FiFolder } from 'react-icons/fi';
import type { FileItem } from '../../types';

interface FolderCardProps {
  folder: FileItem;
  onClick: () => void;
}

export default function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="group relative rounded-xl border border-white/5 hover:border-cyan/30 bg-white/[0.02] hover:bg-white/5 transition-all p-4 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-cyan/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          <FiFolder size={24} className="text-cyan/60 group-hover:text-cyan transition-colors" />
        </div>
        <p className="text-xs text-white/70 group-hover:text-white transition-colors truncate max-w-full">
          {folder.name}
        </p>
        <span className="text-[10px] text-white/30">Folder</span>
      </div>
    </button>
  );
}
