import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { filesApi } from '../services/api';
import type { FileItem } from '../types';
import DocumentEditor from '../components/DocumentEditor/DocumentEditor';

export default function DocumentFileEditor() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    Promise.all([
      filesApi.details(fileId),
      filesApi.getContent(fileId),
    ]).then(([fileData, contentData]) => {
      setFile(fileData);
      setContent(contentData.content || '');
    }).catch(() => {
      toast.error('Failed to load file');
      navigate('/');
    }).finally(() => setLoading(false));
  }, [fileId, navigate]);

  const handleSave = useCallback(async (newContent: string) => {
    if (!fileId) return;
    try {
      await filesApi.saveContent(fileId, newContent);
    } catch {
      toast.error('Save failed');
    }
  }, [fileId]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F19] flex items-center justify-center">
        <div className="gradient-mesh" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-transparent border border-cyan/20 flex items-center justify-center mx-auto mb-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full" />
          </div>
          <p className="text-white/40 text-sm">Opening document...</p>
        </motion.div>
      </div>
    );
  }

  if (!file) return null;

  const doc = {
    id: file.id,
    name: file.originalName || file.name,
    content,
    ownerId: file.userId,
    folderId: file.folderId,
    templateId: null,
    wordCount: 0,
    characterCount: 0,
    version: 1,
    isLocked: false,
    lockedBy: null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };

  return (
    <DocumentEditor
      document={doc}
      onSave={async (newContent, meta) => {
        await handleSave(newContent);
      }}
      onBack={handleBack}
    />
  );
}
