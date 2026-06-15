import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SharedFile from './pages/SharedFile';
import ShareManage from './pages/ShareManage';
import Profile from './pages/Profile';
import FileEditor from './pages/FileEditor';
import Trash from './pages/Trash';
import SearchResults from './pages/SearchResults';
import FavoritesPage from './pages/FavoritesPage';
import ActivityLogPage from './pages/ActivityLogPage';
import UploadRequestPage from './pages/UploadRequestPage';
import PublicUploadRequest from './pages/PublicUploadRequest';
import TwoFactorSetupPage from './pages/TwoFactorSetup';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import WorkspaceDetail from './pages/WorkspaceDetail';
import WebDAVSettings from './pages/WebDAVSettings';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/s/:token" element={<SharedFile />} />
      <Route path="/request/:token" element={<PublicUploadRequest />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="folder/:folderId" element={<Dashboard />} />
        <Route path="shares" element={<ShareManage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="trash" element={<Trash />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="editor" element={<FileEditor />} />
        <Route path="editor/:fileId" element={<FileEditor />} />
        <Route path="activity" element={<ActivityLogPage />} />
        <Route path="upload-requests" element={<UploadRequestPage />} />
        <Route path="2fa" element={<TwoFactorSetupPage />} />
        <Route path="workspaces" element={<WorkspaceDashboard />} />
        <Route path="workspaces/:id" element={<WorkspaceDetail />} />
        <Route path="webdav" element={<WebDAVSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
