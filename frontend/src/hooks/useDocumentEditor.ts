import { useState, useCallback } from 'react';
import { documentsApi } from '../services/api';
import type { NexusDocument, DocumentTemplate } from '../types';

export function useDocumentEditor(docId?: string) {
  const [document, setDocument] = useState<NexusDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  const fetch = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const doc = await documentsApi.get(docId);
      setDocument(doc);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  const create = useCallback(async (data: { name?: string; content?: string; templateId?: string }) => {
    setLoading(true);
    try {
      const doc = await documentsApi.create(data);
      setDocument(doc);
      return doc;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create document');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (content: string, meta: { wordCount: number; characterCount: number }) => {
    if (!document) return;
    try {
      const updated = await documentsApi.update(document.id, { content, ...meta });
      setDocument(updated);
    } catch (err: any) {
      console.error('Save failed:', err);
    }
  }, [document]);

  const loadTemplates = useCallback(async () => {
    try {
      const tpls = await documentsApi.templates();
      setTemplates(tpls);
    } catch {}
  }, []);

  return { document, loading, error, templates, fetch, create, save, loadTemplates };
}

