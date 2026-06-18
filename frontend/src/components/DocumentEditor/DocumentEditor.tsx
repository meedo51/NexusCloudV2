import { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import StarterKit from '@tiptap/starter-kit';
import { motion } from 'framer-motion';
import {
  FiChevronLeft, FiDownload, FiFileText, FiClock, FiSave, FiMenu,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import DocumentToolbar from './DocumentToolbar';
import FloatingToolbar from './FloatingToolbar';
import StatusBar from './StatusBar';
import ExportDialog from './ExportDialog';
import DocumentSidebar from './DocumentSidebar';
import FindReplaceDialog from './FindReplaceDialog';
import { FindReplaceExtension } from '../../extensions/FindReplaceExtension';
import { FontSizeExtension } from '../../extensions/FontSizeExtension';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { NexusDocument } from '../../types';

interface DocumentEditorProps {
  document: NexusDocument;
  onSave: (content: string, meta: { wordCount: number; characterCount: number }) => void;
  onBack: () => void;
}

export default function DocumentEditor({ document, onSave, onBack }: DocumentEditorProps) {
  const [showExport, setShowExport] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [whitePage, setWhitePage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: { depth: 100 },
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-cyan underline' } }),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      TextStyle,
      FontSizeExtension,
      Placeholder.configure({ placeholder: 'Start writing...' }),
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      FindReplaceExtension,
    ],
    content: document.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[600px] px-10 py-8',
      },
    },
  });

  // Toggle white-page class on editor DOM element
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    if (whitePage) {
      dom.classList.add('white-page');
    } else {
      dom.classList.remove('white-page');
    }
  }, [editor, whitePage]);

  // Keyboard shortcuts
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const ed = editorRef.current;
        if (ed) {
          const content = ed.getHTML();
          const meta = {
            wordCount: ed.storage.characterCount?.words?.() || 0,
            characterCount: ed.storage.characterCount?.characters?.() || 0,
          };
          setIsSaving(true);
          onSaveRef.current(content, meta).finally(() => setIsSaving(false));
        }
        return;
      }
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showFindReplace]);

  useAutoSave({
    editor,
    documentId: document.id,
    onSave: async (content, meta) => {
      setIsSaving(true);
      try {
        await onSave(content, meta);
      } finally {
        setIsSaving(false);
      }
    },
  });

  const handleExport = async (format: string) => {
    if (!editor) return;
    let content = '';
    let filename = document.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    switch (format) {
      case 'html':
        content = editor.getHTML();
        break;
      case 'markdown': {
        const TurndownService = (await import('turndown')).default;
        const turndown = new TurndownService({ headingStyle: 'atx' });
        content = turndown.turndown(editor.getHTML());
        filename += '.md';
        break;
      }
      case 'txt':
        content = editor.getText();
        filename += '.txt';
        break;
      case 'pdf': {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        const canvas = await html2canvas(editor.view.dom);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
        toast.success('PDF downloaded');
        return;
      }
      default:
        content = editor.getHTML();
        filename += '.html';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format}`);
  };

  if (!editor) return null;

  return (
    <div className={`document-editor fixed inset-0 z-50 overflow-hidden ${whitePage ? 'bg-white' : 'bg-[#0B0F19]'}`}>
      {!whitePage && <div className="gradient-mesh" />}

      {/* Exit button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        onClick={onBack}
        className={`fixed top-4 left-4 z-50 glass rounded-2xl px-4 py-2 text-sm flex items-center gap-2 border transition-all ${
          whitePage ? 'text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-400 bg-white/80' : 'text-white/60 hover:text-cyan border-white/5 hover:border-cyan/30'
        }`}
      >
        <FiChevronLeft size={16} />
        <span className="hidden sm:inline">NexusCloud</span>
      </motion.button>

      {/* Save indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {isSaving && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-2 text-xs ${whitePage ? 'text-gray-400' : 'text-white/40'}`}>
            <FiClock size={12} />
            Saving...
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setShowSidebar(!showSidebar)}
          className={`glass rounded-2xl px-3 py-2 text-sm flex items-center gap-2 border transition-all ${
            showSidebar
              ? 'text-cyan border-cyan/30'
              : whitePage
                ? 'text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-400 bg-white/80'
                : 'text-white/60 hover:text-cyan border-white/5 hover:border-cyan/30'
          }`}
          title="Toggle sidebar"
        >
          <FiMenu size={14} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setShowExport(true)}
          className={`glass rounded-2xl px-4 py-2 text-sm flex items-center gap-2 border transition-all ${
            whitePage ? 'text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-400 bg-white/80' : 'text-white/60 hover:text-cyan border-white/5 hover:border-cyan/30'
          }`}
        >
          <FiDownload size={14} />
          <span className="hidden sm:inline">Export</span>
        </motion.button>
      </div>

      {/* Toolbar */}
      <div className="pt-16 px-4">
        <DocumentToolbar
          editor={editor}
          onToggleWhitePage={() => setWhitePage(!whitePage)}
          isWhitePage={whitePage}
        />
      </div>

      {/* Editor area */}
      <div className={`flex h-[calc(100vh-200px)] overflow-hidden ${whitePage ? 'bg-gray-50' : ''}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto my-6">
            <div className={`rounded-2xl shadow-2xl border overflow-hidden ${
              whitePage
                ? 'bg-white border-gray-200 shadow-gray-200/50'
                : 'bg-[#0F1521] border-white/5'
            }`}>
              <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
                <FloatingToolbar editor={editor} />
              </BubbleMenu>
              <div className={whitePage ? 'p-4' : 'p-4'}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
        <DocumentSidebar
          editor={editor}
          document={document}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          whitePage={whitePage}
        />
      </div>

      {/* Status bar */}
      <StatusBar editor={editor} version={document.version} whitePage={whitePage} />

      {/* Find/Replace dialog */}
      <FindReplaceDialog
        editor={editor}
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
      />

      {/* Export dialog */}
      {showExport && <ExportDialog onExport={handleExport} onClose={() => setShowExport(false)} />}
    </div>
  );
}
