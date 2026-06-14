import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import { filesApi } from '../services/api';
import { BreadcrumbItem } from '../types';

interface BreadcrumbsProps {
  folderId?: string;
}

export default function Breadcrumbs({ folderId }: BreadcrumbsProps) {
  const navigate = useNavigate();
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (folderId) {
      filesApi.breadcrumb(folderId).then(setCrumbs).catch(() => setCrumbs([]));
    } else {
      setCrumbs([]);
    }
  }, [folderId]);

  return (
    <nav className="flex items-center gap-1 text-sm text-white/50 overflow-x-auto pb-1">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 hover:text-cyan transition-colors flex-shrink-0"
      >
        <FiHome size={14} />
        <span>Home</span>
      </button>
      {crumbs.map((crumb, idx) => (
        <span key={crumb.id} className="flex items-center gap-1 flex-shrink-0">
          <FiChevronRight size={14} className="text-white/20" />
          {idx === crumbs.length - 1 ? (
            <span className="text-white/80 font-medium px-2 py-1">{crumb.name}</span>
          ) : (
            <button
              onClick={() => navigate(`/folder/${crumb.id}`)}
              className="px-2 py-1 rounded-lg hover:bg-white/5 hover:text-cyan transition-colors"
            >
              {crumb.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
