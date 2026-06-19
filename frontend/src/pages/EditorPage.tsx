import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import toast from 'react-hot-toast';
import { filesApi } from '../services/api';
import { FileItem } from '../types';
import { getTemplate } from '../utils/fileTemplates';
import EditorToolbar from '../components/Editor/EditorToolbar';
import StatusBar from '../components/Editor/StatusBar';
import FileTree from '../components/Editor/FileTree';

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  mjs: 'javascript', cjs: 'javascript', mts: 'typescript', cts: 'typescript',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', kt: 'kotlin', kts: 'kotlin',
  cpp: 'cpp', c: 'c', cs: 'csharp', h: 'c', hpp: 'cpp',
  php: 'php', swift: 'swift',
  json: 'json', xml: 'xml', xhtml: 'xml', svg: 'xml',
  yaml: 'yaml', yml: 'yaml',
  md: 'markdown', mdx: 'markdown',
  sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell',
  dockerfile: 'dockerfile',
  env: 'dotenv', gitignore: 'ignore',
  toml: 'toml', ini: 'ini', cfg: 'ini',
  vue: 'html', svelte: 'html',
  tf: 'terraform', tfvars: 'terraform',
  ps1: 'powershell', bat: 'bat', cmd: 'bat',
  diff: 'diff', patch: 'diff',
  graphql: 'graphql', gql: 'graphql',
  makefile: 'makefile', mk: 'makefile',
};

function getLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (name.toLowerCase() === 'dockerfile') return 'dockerfile';
  if (name.toLowerCase() === 'makefile') return 'makefile';
  return LANG_MAP[ext] || 'plaintext';
}

function getFileTypeBadge(lang: string): string {
  const map: Record<string, string> = {
    javascript: 'JS', typescript: 'TS', html: 'HTML', css: 'CSS',
    python: 'PY', json: 'JSON', markdown: 'MD', shell: 'SH',
    sql: 'SQL', php: 'PHP', yaml: 'YAML', xml: 'XML',
    dockerfile: 'Docker', scss: 'SCSS', less: 'LESS',
    rust: 'RS', go: 'GO', java: 'JAVA', cpp: 'CPP', csharp: 'CS',
    ruby: 'RB', swift: 'SWIFT', kotlin: 'KT',
    plaintext: 'TXT',
  };
  return map[lang] || lang.toUpperCase().slice(0, 4);
}

export default function EditorPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<FileItem | null>(null);
  const [language, setLanguage] = useState('plaintext');
  const [loading, setLoading] = useState(!!fileId);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(!fileId);
  const [newFileName, setNewFileName] = useState('');
  const [newFileFolderId, setNewFileFolderId] = useState<string | null>(null);

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [lineCount, setLineCount] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isDirtyRef = useRef(false);
  const contentRef = useRef('');

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!fileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      filesApi.getContent(fileId),
      filesApi.getFileInfo(fileId).catch(() => null),
    ]).then(([contentRes, infoRes]) => {
      setContent(contentRes.content);
      setOriginalContent(contentRes.content);
      contentRef.current = contentRes.content;
      setFileName(contentRes.name);
      setLanguage(getLanguage(contentRes.name));
      setLineCount(contentRes.content.split('\n').length);
      document.title = `Editing: ${contentRes.name} - NexusCloud`;
    }).catch(() => {
      toast.error('Failed to load file');
      navigate(-1);
    }).finally(() => setLoading(false));
  }, [fileId, navigate]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('nexus-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0B0F19',
        'editor.foreground': '#E2E8F0',
        'editorCursor.foreground': '#00F0FF',
        'editor.selectionBackground': '#00F0FF33',
        'editor.selectionHighlightBackground': '#00F0FF15',
        'editorLineNumber.foreground': '#4A5568',
        'editorLineNumber.activeForeground': '#00F0FF',
        'editorRuler.foreground': '#1A202C',
        'editorWidget.background': '#0F1522',
        'editorWidget.border': '#1A202C',
        'editorWidget.foreground': '#E2E8F0',
        'input.background': '#0B0F19',
        'input.border': '#1A202C',
        'input.foreground': '#E2E8F0',
        'list.hoverBackground': '#00F0FF10',
        'list.activeSelectionBackground': '#00F0FF20',
        'list.inactiveSelectionBackground': '#00F0FF10',
        'minimap.background': '#0B0F19',
        'scrollbarSlider.background': '#00F0FF20',
        'scrollbarSlider.hoverBackground': '#00F0FF30',
        'scrollbarSlider.activeBackground': '#00F0FF40',
      },
    });
    monaco.editor.setTheme('nexus-dark');

    editor.onDidChangeCursorPosition(e => {
      setCursorLine(e.position.lineNumber);
      setCursorColumn(e.position.column);
    });
  };

  const handleContentChange = useCallback((val: string | undefined) => {
    const v = val || '';
    contentRef.current = v;
    setContent(v);
    setLineCount(v.split('\n').length);
    setIsDirty(v !== originalContent);
  }, [originalContent]);

  const handleSave = useCallback(async () => {
    if (isNew) {
      if (!newFileName.trim()) { toast.error('File name is required'); return; }
      setSaving(true);
      try {
        const created = await filesApi.createFile(newFileName.trim(), content, newFileFolderId || undefined);
        toast.success('File created');
        navigate(`/editor/${created.id}`, { replace: true });
        setFileName(newFileName.trim());
        setOriginalContent(content);
        setIsNew(false);
        setNewFileName('');
        setIsDirty(false);
        document.title = `Editing: ${newFileName.trim()} - NexusCloud`;
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create file');
      }
      setSaving(false);
      return;
    }

    if (!fileId) return;
    setSaving(true);
    try {
      await filesApi.saveContent(fileId, content);
      setOriginalContent(content);
      setIsDirty(false);
      toast.success('Saved');
      editorRef.current?.getModel()?.pushStackElement();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  }, [isNew, newFileName, newFileFolderId, content, fileId, navigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleSave, isFullscreen]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleUndo = () => editorRef.current?.trigger('keyboard', 'undo', null);
  const handleRedo = () => editorRef.current?.trigger('keyboard', 'redo', null);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-12 glass rounded-2xl animate-pulse" />
        <div className="flex gap-3 flex-1 min-h-0">
          <div className="w-48 glass rounded-2xl animate-pulse hidden md:block" />
          <div className="flex-1 glass rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const lang = getLanguage(fileName);
  const badge = getFileTypeBadge(lang);

  const editorContent = (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-40 p-3 bg-space' : 'flex-1 min-h-0'}`}>
      <EditorToolbar
        fileName={isNew ? (newFileName || 'untitled') : fileName}
        fileType={lang}
        fileTypeBadge={badge}
        isDirty={isDirty}
        isSaving={saving}
        fontSize={fontSize}
        wordWrap={wordWrap === 'on'}
        isFullscreen={isFullscreen}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFontSizeChange={setFontSize}
        onWordWrapToggle={() => setWordWrap(w => w === 'on' ? 'off' : 'on')}
        onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
        onBack={() => navigate(-1)}
      />

      <div className="flex gap-3 flex-1 min-h-0">
        {!isFullscreen && (
          <div className="w-52 flex-shrink-0 hidden md:block">
            <div className="glass rounded-2xl p-2 h-full overflow-y-auto custom-scrollbar">
              <FileTree currentFileId={fileId || ''} folderId={file?.folderId || null} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {isNew ? (
            <div className="flex flex-col flex-1 gap-3 min-h-0">
              <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={e => {
                    setNewFileName(e.target.value);
                    setFileName(e.target.value);
                  }}
                  placeholder="filename.ext"
                  className="bg-white/5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none border border-cyan/30 w-64 text-white placeholder-white/20"
                />
                <span className="text-xs text-white/30">{lang === 'plaintext' ? 'Plain Text' : lang}</span>
              </div>
              <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/5">
                <Editor
                  height="100%"
                  language={lang}
                  value={content}
                  onChange={handleContentChange}
                  theme="nexus-dark"
                  options={{
                    fontSize,
                    wordWrap,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    folding: true,
                    bracketPairColorization: { enabled: true },
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoIndent: 'full',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'all',
                    contextmenu: true,
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    tabCompletion: 'on',
                    wordBasedSuggestions: 'currentDocument',
                    parameterHints: { enabled: true },
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center">
                      <div className="w-8 h-8 rounded-xl bg-cyan/20 animate-pulse" />
                    </div>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/5">
              <Editor
                height="100%"
                language={lang}
                value={content}
                onChange={handleContentChange}
                theme="nexus-dark"
                onMount={handleEditorDidMount}
                options={{
                  fontSize,
                  wordWrap,
                  minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
                  lineNumbers: 'on',
                  folding: true,
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'all',
                  contextmenu: true,
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  tabCompletion: 'on',
                  wordBasedSuggestions: 'currentDocument',
                  parameterHints: { enabled: true },
                  multiCursorModifier: 'alt',
                  formatOnPaste: true,
                  matchBrackets: 'always',
                  autoClosingDelete: 'always',
                  autoClosingOvertype: 'always',
                  selectionHighlight: true,
                  occurrencesHighlight: 'singleFile',
                  renderWhitespace: 'selection',
                }}
                loading={
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-xl bg-cyan/20 animate-pulse" />
                  </div>
                }
              />
            </div>
          )}

          <StatusBar
            line={cursorLine}
            column={cursorColumn}
            lineCount={lineCount}
            language={badge}
            encoding="UTF-8"
            spacesOrTabs={`Spaces: 2`}
            isDirty={isDirty}
          />
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return editorContent;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full min-h-0">
      {editorContent}
    </motion.div>
  );
}
