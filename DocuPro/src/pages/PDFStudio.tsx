import { useState, useEffect } from 'react';
import { FiFile, FiUpload, FiLayers, FiDownload, FiTrash2, FiChevronLeft, FiChevronRight, FiType, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { docuproApi } from '../services/api';
import AppLayout from '../components/AppLayout';

interface PDFFile {
  id: string;
  name: string;
  size: number;
  pageCount?: number;
  createdAt: string;
}

export default function PDFStudio() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [annotations, setAnnotations] = useState<Record<string, any[]>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    try {
      const res = await docuproApi.pdf.list();
      setFiles(res.data || []);
    } catch { toast.error('Failed to load PDF files'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const mergePDFs = async () => {
    if (selectedIds.length < 2) { toast.error('Select at least 2 PDFs'); return; }
    setMerging(true);
    try {
      const res = await docuproApi.pdf.merge({ fileIds: selectedIds });
      toast.success('PDFs merged successfully');
      setSelectedIds([]);
      loadFiles();
    } catch { toast.error('Merge failed'); }
    finally { setMerging(false); }
  };

  const loadAnnotations = async (fileId: string) => {
    try {
      const res = await docuproApi.pdf.annotate({ fileId, annotations: annotations[fileId] || [] });
      setActiveFile(fileId);
    } catch { toast.error('Failed to load annotations'); }
  };

  const addAnnotation = (fileId: string) => {
    const content = prompt('Annotation text:');
    if (!content) return;
    const newAnn = { id: Date.now().toString(), content, color: '#FFD93D', type: 'comment', createdAt: new Date().toISOString() };
    setAnnotations(prev => ({ ...prev, [fileId]: [...(prev[fileId] || []), newAnn] }));
  };

  const saveAnnotations = async (fileId: string) => {
    try {
      await docuproApi.pdf.annotate({ fileId, annotations: annotations[fileId] || [] });
      toast.success('Annotations saved');
    } catch { toast.error('Failed to save annotations'); }
  };

  const extractText = async (fileId: string) => {
    setExtracting(true);
    setExtractedText(null);
    try {
      const res = await docuproApi.pdf.extractText(fileId);
      setExtractedText(res.data.text || 'No text extracted');
      setActiveFile(fileId);
    } catch { toast.error('Text extraction failed'); }
    finally { setExtracting(false); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeAnn = activeFile ? annotations[activeFile] || [] : [];

  return (
    <AppLayout title="PDF Studio">
      <div className="flex h-full">
        {sidebarOpen && (
          <aside className="w-72 border-r border-white/10 bg-white/[0.02] flex flex-col">
            <div className="p-3 border-b border-white/10 space-y-2">
              {selectedIds.length >= 2 && (
                <button onClick={mergePDFs} disabled={merging} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple/20 hover:bg-purple/30 text-purple text-sm transition-colors disabled:opacity-50">
                  <FiLayers size={16} /> {merging ? 'Merging...' : `Merge (${selectedIds.length})`}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {files.map(file => (
                <div key={file.id} className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeFile === file.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}>
                  <input type="checkbox" checked={selectedIds.includes(file.id)} onChange={() => toggleSelect(file.id)} className="accent-cyan" />
                  <FiFile size={16} className="shrink-0 text-red-400" />
                  <div className="flex-1 min-w-0" onClick={() => setActiveFile(file.id)}>
                    <p className="truncate">{file.name}</p>
                    <p className="text-[10px] text-white/30">{formatSize(file.size)}{file.pageCount ? ` · ${file.pageCount} pages` : ''}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => addAnnotation(file.id)} className="p-1 hover:text-cyan transition-colors" title="Add annotation"><FiEdit3 size={14} /></button>
                    <button onClick={() => extractText(file.id)} className="p-1 hover:text-green-400 transition-colors" title="Extract text"><FiType size={14} /></button>
                  </div>
                </div>
              ))}
              {files.length === 0 && <p className="text-white/30 text-xs text-center py-8">No PDF files found. Upload PDFs from the Files page to see them here.</p>}
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col">
          {activeFile ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white/90">{files.find(f => f.id === activeFile)?.name || 'PDF'}</h2>
                <div className="flex gap-2">
                  <button onClick={() => saveAnnotations(activeFile)} className="px-3 py-1.5 rounded text-xs bg-cyan/20 text-cyan hover:bg-cyan/30 transition-colors">Save Annotations</button>
                  <button onClick={() => extractText(activeFile)} disabled={extracting} className="px-3 py-1.5 rounded text-xs bg-white/10 text-white/60 hover:bg-white/20 transition-colors disabled:opacity-50">
                    {extracting ? 'Extracting...' : 'Extract Text'}
                  </button>
                </div>
              </div>

              {extractedText && (
                <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-sm font-medium text-white/60 mb-2">Extracted Text</h3>
                  <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans">{extractedText}</pre>
                </div>
              )}

              {activeAnn.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60">Annotations</h3>
                  {activeAnn.map((ann: any) => (
                    <div key={ann.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border-l-4" style={{ borderLeftColor: ann.color }}>
                      <p className="text-sm text-white/70 flex-1">{ann.content}</p>
                      <button
                        onClick={() => {
                          setAnnotations(prev => ({ ...prev, [activeFile]: prev[activeFile]?.filter((a: any) => a.id !== ann.id) || [] }));
                        }}
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeAnn.length === 0 && !extractedText && (
                <div className="text-center py-16 text-white/30">
                  <FiFile size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No annotations yet. Click the edit icon on a file to add one.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              <div className="text-center">
                <FiFile size={48} className="mx-auto mb-4 opacity-30" />
                <p>Select a PDF file to view details</p>
                <p className="text-xs mt-2">Select 2+ files and click Merge to combine them</p>
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
