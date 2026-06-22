import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { FiBold, FiItalic, FiUnderline, FiList, FiLink, FiType, FiSave, FiPlus, FiTrash2, FiDownload, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { docuproApi } from '../shared/services/api';
import AppLayout from '../shared/components/AppLayout';

interface WordDoc {
  id: string;
  name: string;
  content: string;
  wordCount: number;
  format: string;
  updatedAt: string;
}

export default function WordStudio() {
  const [docs, setDocs] = useState<WordDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<WordDoc | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    onUpdate: ({ editor }) => {
      if (activeDoc) {
        const timer = setTimeout(() => saveDoc(editor.getHTML()), 2000);
        return () => clearTimeout(timer);
      }
    },
  });

  useEffect(() => { loadDocs(); }, []);

  useEffect(() => {
    if (editor && activeDoc) {
      if (editor.getHTML() !== activeDoc.content) {
        editor.commands.setContent(activeDoc.content || '');
      }
    }
  }, [activeDoc, editor]);

  const loadDocs = async () => {
    try {
      const res = await docuproApi.word.list();
      setDocs(res.data.documents || []);
    } catch { toast.error('Failed to load documents'); }
  };

  const createDoc = async () => {
    try {
      const res = await docuproApi.word.create({ name: 'Untitled Document' });
      const newDoc = res.data;
      setDocs(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      editor?.commands.setContent('');
    } catch { toast.error('Failed to create document'); }
  };

  const saveDoc = useCallback(async (content?: string) => {
    if (!activeDoc) return;
    setSaving(true);
    try {
      const html = content || editor?.getHTML() || '';
      const res = await docuproApi.word.update(activeDoc.id, { content: html });
      setActiveDoc(res.data);
      setDocs(prev => prev.map(d => d.id === activeDoc.id ? res.data : d));
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }, [activeDoc, editor]);

  const deleteDoc = async (id: string) => {
    try {
      await docuproApi.word.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      if (activeDoc?.id === id) setActiveDoc(null);
      toast.success('Document deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const exportDoc = (format: 'html' | 'markdown' | 'text') => {
    if (!activeDoc) return;
    let content = editor?.getHTML() || '';
    let ext = 'html';
    if (format === 'text') {
      content = content.replace(/<[^>]*>/g, '');
      ext = 'txt';
    }
    if (format === 'markdown') {
      const el = document.createElement('div');
      el.innerHTML = content;
      content = el.textContent || '';
      ext = 'md';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.name || 'document'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <AppLayout title="Word Studio">
      <div className="flex h-full">
        {sidebarOpen && (
          <aside className="w-72 border-r border-white/10 bg-white/[0.02] flex flex-col">
            <div className="p-3 border-b border-white/10">
              <button onClick={createDoc} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan text-sm transition-colors">
                <FiPlus size={16} /> New Document
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeDoc?.id === doc.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                >
                  <span className="truncate flex-1">{doc.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              {docs.length === 0 && <p className="text-white/30 text-xs text-center py-8">No documents yet</p>}
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col">
          {activeDoc ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-1">
                  <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bold') ? 'bg-cyan/20 text-cyan' : 'text-white/60'}`}><FiBold size={16} /></button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('italic') ? 'bg-cyan/20 text-cyan' : 'text-white/60'}`}><FiItalic size={16} /></button>
                  <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('underline') ? 'bg-cyan/20 text-cyan' : 'text-white/60'}`}><FiUnderline size={16} /></button>
                  <span className="w-px h-5 bg-white/10 mx-1" />
                  <select onChange={(e) => editor?.chain().focus().toggleHeading({ level: parseInt(e.target.value) as any }).run()} className="bg-transparent text-xs text-white/60 border border-white/10 rounded px-2 py-1">
                    <option value="0">Normal</option>
                    <option value="1">H1</option>
                    <option value="2">H2</option>
                    <option value="3">H3</option>
                  </select>
                  <span className="w-px h-5 bg-white/10 mx-1" />
                  <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('bulletList') ? 'bg-cyan/20 text-cyan' : 'text-white/60'}`}><FiList size={16} /></button>
                  <button onClick={addLink} className={`p-2 rounded hover:bg-white/10 ${editor?.isActive('link') ? 'bg-cyan/20 text-cyan' : 'text-white/60'}`}><FiLink size={16} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportDoc('html')} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-white/60 hover:bg-white/10 transition-colors"><FiDownload size={14} /> Export</button>
                  <button onClick={() => saveDoc()} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-cyan/20 text-cyan hover:bg-cyan/30 transition-colors disabled:opacity-50">
                    <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <input
                  value={activeDoc.name}
                  onChange={(e) => setActiveDoc(prev => prev ? { ...prev, name: e.target.value } : null)}
                  onBlur={() => saveDoc()}
                  className="w-full bg-transparent text-xl font-semibold text-white/90 border-none outline-none mb-4 placeholder-white/30"
                  placeholder="Untitled Document"
                />
                <div className="max-w-4xl mx-auto prose prose-invert prose-cyan">
                  <EditorContent editor={editor} className="min-h-[60vh] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60vh] [&_.ProseMirror_p]:text-white/80 [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h2]:text-white/90 [&_.ProseMirror_h3]:text-white/80 [&_.ProseMirror_ul]:text-white/70 [&_.ProseMirror_ol]:text-white/70" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              <div className="text-center">
                <FiType size={48} className="mx-auto mb-4 opacity-30" />
                <p>Select a document or create a new one</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute right-4 bottom-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-colors z-10">
          {sidebarOpen ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>
    </AppLayout>
  );
}
