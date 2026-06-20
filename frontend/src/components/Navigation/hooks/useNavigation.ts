import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { filesApi, workspacesApi } from '../../../services/api';
import type { FileItem, FavoriteEntry, Workspace } from '../../../types';

interface UseNavigationResult {
  folders: FileItem[];
  favorites: FavoriteEntry[];
  workspaces: Workspace[];
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  currentFolderId: string | null;
  favoritesCount: number;
  trashCount: number;
}

export function useNavigation(): UseNavigationResult {
  const location = useLocation();
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    home: true,
    studio: false,
    tools: true,
    folders: true,
    favorites: true,
  });

  const load = useCallback(() => {
    filesApi.list({ sortBy: 'name', sortOrder: 'asc' }).then(files => {
      setFolders(files.filter((f: FileItem) => f.isFolder));
    }).catch(() => {});
    filesApi.favorites().then(setFavorites).catch(() => {});
    workspacesApi.list().then(setWorkspaces).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load, location.pathname]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const currentFolderId = location.pathname.startsWith('/folder/')
    ? location.pathname.split('/folder/')[1]
    : null;

  return {
    folders,
    favorites,
    workspaces,
    expandedSections,
    toggleSection,
    currentFolderId,
    favoritesCount: favorites.length,
    trashCount: 0,
  };
}
