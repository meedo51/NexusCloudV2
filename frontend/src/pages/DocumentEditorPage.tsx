import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DocumentEditor from '../components/DocumentEditor/DocumentEditor';
import TemplateGallery from '../components/DocumentEditor/TemplateGallery';
import { documentsApi } from '../services/api';
import type { NexusDocument, DocumentTemplate } from '../types';

export default function DocumentEditorPage() {
  const { docId } = useParams<{ docId?: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<NexusDocument | null>(null);
  const [loading, setLoading] = useState(!!docId);
  const [showGallery, setShowGallery] = useState(!docId);

  useEffect(() => {
    if (docId) {
      setLoading(true);
      documentsApi.get(docId)
        .then(setDocument)
        .catch(() => toast.error('Failed to load document'))
        .finally(() => setLoading(false));
    }
  }, [docId]);

  const handleCreate = useCallback(async (template: DocumentTemplate) => {
    setShowGallery(false);
    setLoading(true);
    try {
      const doc = await documentsApi.create({
        name: template.name,
        content: template.content,
        templateId: template.id,
      });
      setDocument(doc);
    } catch {
      toast.error('Failed to create document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSave = useCallback(async (content: string, meta: { wordCount: number; characterCount: number }) => {
    if (!document) return;
    try {
      const updated = await documentsApi.update(document.id, { content, ...meta });
      setDocument(updated);
    } catch {
      // silent fail - auto-save
    }
  }, [document]);

  const handleBack = useCallback(() => {
    navigate('/documents');
  }, [navigate]);

  if (showGallery) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F19] flex items-center justify-center">
        <div className="gradient-mesh" />
        <TemplateGalleryPage onSelect={handleCreate} onSkip={() => handleCreate({ id: 'blank', name: 'Blank Document', category: 'general', content: '' })} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F19] flex items-center justify-center">
        <div className="gradient-mesh" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-transparent border border-cyan/20 flex items-center justify-center mx-auto mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full"
            />
          </div>
          <p className="text-white/40 text-sm">Opening document...</p>
        </motion.div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F19] flex items-center justify-center">
        <p className="text-white/40">Document not found</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="editor"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <DocumentEditor document={document} onSave={handleSave} onBack={handleBack} />
      </motion.div>
    </AnimatePresence>
  );
}

function TemplateGalleryPage({ onSelect, onSkip }: { onSelect: (t: DocumentTemplate) => void; onSkip: (t: DocumentTemplate) => void }) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  useEffect(() => {
    documentsApi.templates().then(setTemplates).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto p-8"
    >
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => window.history.back()}
        className="mb-6 glass rounded-2xl px-4 py-2 text-sm text-white/60 hover:text-cyan flex items-center gap-2 border border-white/5 hover:border-cyan/30 transition-all w-fit"
      >
        ← Back
      </motion.button>

      <h1 className="text-2xl font-semibold text-white mb-2">New Document</h1>
      <p className="text-white/40 text-sm mb-8">Choose a template to get started</p>

      <div className="mb-8">
        <button
          onClick={() => onSkip(templates.find(t => t.id === 'blank') || { id: 'blank', name: 'Blank Document', category: 'general', content: '' })}
          className="glass rounded-2xl p-6 text-center border border-white/5 hover:border-cyan/30 transition-all group w-full"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-cyan/20 transition-colors">
            <svg className="w-6 h-6 text-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-white font-medium">Blank Document</p>
          <p className="text-white/30 text-xs mt-1">Start from scratch</p>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {templates.filter(t => t.id !== 'blank').map((template, i) => (
          <motion.button
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(template)}
            className="glass rounded-xl p-4 text-left border border-white/5 hover:border-cyan/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/10 to-transparent flex items-center justify-center mb-3 group-hover:from-cyan/20 transition-colors">
              <svg className="w-5 h-5 text-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium">{template.name}</p>
            <p className="text-white/30 text-xs mt-1 capitalize">{template.category}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

