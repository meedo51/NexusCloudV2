import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiGrid, FiFile, FiClock, FiPlus, FiTrendingUp, FiDroplet, FiDatabase } from 'react-icons/fi';
import { docuproApi } from '../services/api';

interface Stat {
  label: string;
  value: string | number;
  icon: typeof FiFileText;
  color: string;
  route: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ wordDocs: 0, excelSheets: 0, pdfFiles: 0 });

  useEffect(() => {
    Promise.all([
      docuproApi.word.list().catch(() => ({ data: { documents: [] } })),
      docuproApi.excel.list().catch(() => ({ data: { spreadsheets: [] } })),
      docuproApi.pdf.list().catch(() => ({ data: [] })),
    ]).then(([wordRes, excelRes, pdfRes]) => {
      setStats({
        wordDocs: (wordRes.data as any)?.documents?.length || 0,
        excelSheets: (excelRes.data as any)?.spreadsheets?.length || 0,
        pdfFiles: (pdfRes.data as any)?.length || 0,
      });
    });
  }, []);

  const quickActions = [
    { label: 'New Document', icon: FiFileText, route: '/word', color: 'from-blue-500 to-cyan-500' },
    { label: 'New Spreadsheet', icon: FiGrid, route: '/excel', color: 'from-green-500 to-emerald-500' },
    { label: 'Manage PDFs', icon: FiFile, route: '/pdf', color: 'from-red-500 to-orange-500' },
  ];

  const statCards: Stat[] = [
    { label: 'Word Documents', value: stats.wordDocs, icon: FiFileText, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', route: '/word' },
    { label: 'Spreadsheets', value: stats.excelSheets, icon: FiGrid, color: 'from-green-500/20 to-emerald-500/20 border-green-500/30', route: '/excel' },
    { label: 'PDF Files', value: stats.pdfFiles, icon: FiFile, color: 'from-red-500/20 to-orange-500/20 border-red-500/30', route: '/pdf' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan/20 to-purple/20">
          <FiDroplet className="text-cyan" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-cyan to-blue-400 bg-clip-text text-transparent">
            DocuPro Suite
          </h1>
          <p className="text-xs text-white/40">Cloud Productivity Tools</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCards.map((stat, i) => (
              <motion.button
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(stat.route)}
                className={`p-5 rounded-2xl bg-gradient-to-br ${stat.color} border ${stat.color.split(' ')[2]} hover:scale-[1.02] transition-all text-left`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <stat.icon className="text-white/80" size={20} />
                  </div>
                  <FiTrendingUp className="text-white/30 ml-auto" size={16} />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/60 mt-1">{stat.label}</p>
              </motion.button>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
                >
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} bg-opacity-20`}>
                    <action.icon className="text-white" size={18} />
                  </div>
                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{action.label}</span>
                  <FiPlus className="ml-auto text-white/20 group-hover:text-cyan transition-colors" size={16} />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tools Overview */}
          <div>
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Word Studio', desc: 'Full-featured rich text editor with formatting, export, and version history.', icon: FiFileText, route: '/word', color: 'from-blue-500 to-cyan-500' },
                { name: 'Excel Studio', desc: 'Powerful spreadsheet editor with formulas, CSV import, and data management.', icon: FiGrid, route: '/excel', color: 'from-green-500 to-emerald-500' },
                { name: 'PDF Studio', desc: 'Complete PDF toolkit — merge, annotate, extract text, and more.', icon: FiFile, route: '/pdf', color: 'from-red-500 to-orange-500' },
              ].map((tool, i) => (
                <motion.button
                  key={tool.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  onClick={() => navigate(tool.route)}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left group"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${tool.color} mb-3 w-fit`}>
                    <tool.icon className="text-white" size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-white/80 group-hover:text-white transition-colors">{tool.name}</h3>
                  <p className="text-sm text-white/40 mt-1.5 leading-relaxed">{tool.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
