import { motion } from 'framer-motion';
import { FiFileText, FiCode, FiDatabase, FiImage, FiUsers, FiShield, FiBookOpen } from 'react-icons/fi';
import { StudioAppCard } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';

const apps = [
  {
    id: 'nexusdocs',
    name: 'NexusDocs',
    icon: <FiFileText size={24} className="text-cyan" />,
    description: 'Create, edit, and collaborate on rich text documents with a powerful editor.',
    status: 'active',
    color: 'from-cyan/20 to-blue-500/20',
    path: '/documents',
  },
  {
    id: 'nexuspdf',
    name: 'NexusPDF',
    icon: <FiBookOpen size={24} className="text-purple" />,
    description: 'Smart PDF reader with highlights, bookmarks, notes, page thumbnails, and reading mode preferences.',
    status: 'new',
    color: 'from-purple-500/20 to-cyan-500/20',
    path: '/pdf',
  },
  {
    id: 'nexuscode',
    name: 'NexusCode',
    icon: <FiCode size={24} className="text-emerald" />,
    description: 'Code editor with syntax highlighting, git integration, and more.',
    status: 'coming-soon',
    color: 'from-emerald/20 to-green-500/20',
    path: '#',
  },
  {
    id: 'nexusdb',
    name: 'NexusDB',
    icon: <FiDatabase size={24} className="text-violet" />,
    description: 'Visual database manager and query builder for your data.',
    status: 'coming-soon',
    color: 'from-violet/20 to-purple-500/20',
    path: '#',
  },
  {
    id: 'nexusmedia',
    name: 'NexusMedia',
    icon: <FiImage size={24} className="text-rose" />,
    description: 'Media gallery and light-weight image editor.',
    status: 'coming-soon',
    color: 'from-rose/20 to-pink-500/20',
    path: '#',
  },
  {
    id: 'nexusteams',
    name: 'NexusTeams',
    icon: <FiUsers size={24} className="text-amber" />,
    description: 'Team collaboration hub with chat, Kanban boards, and more.',
    status: 'coming-soon',
    color: 'from-amber/20 to-orange-500/20',
    path: '#',
  },
];

export default function StudioPage() {
  const { isAdmin } = useAuth();

  const adminApp = {
    id: 'admin',
    name: 'Admin Dashboard',
    icon: <FiShield size={24} className="text-cyan" />,
    description: 'System administration, user management, settings, audit logs, and server health monitoring.',
    status: 'active',
    color: 'from-cyan/30 to-blue-500/30',
    path: '/admin',
  };

  const displayedApps = isAdmin ? [adminApp, ...apps] : apps;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan to-blue-400 bg-clip-text text-transparent">
          Studio
        </h1>
        <p className="text-white/40 text-sm mt-1">Your creative workspace hub</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedApps.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <StudioAppCard {...app} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
