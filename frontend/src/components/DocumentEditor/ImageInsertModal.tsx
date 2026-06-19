import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLink, FiUpload, FiCloud, FiSearch, FiX, FiImage as FiImageIcon } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, alt?: string) => void;
}

type Tab = 'url' | 'upload' | 'cloud' | 'unsplash';

export default function ImageInsertModal({ isOpen, onClose, onInsert }: ImageInsertModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [urlInput, setUrlInput] = useState('');
  const [altText, setAltText] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setUrlInput('');
      setAltText('');
      setPreviewUrl('');
      setUploadedFile(null);
      setUploadPreview('');
      setUnsplashQuery('');
      setUnsplashResults([]);
    }
  }, [isOpen]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'url', label: 'URL', icon: FiLink },
    { id: 'upload', label: 'Upload', icon: FiUpload },
    { id: 'cloud', label: 'Cloud', icon: FiCloud },
    { id: 'unsplash', label: 'Unsplash', icon: FiSearch },
  ];

  const handleUrlInsert = () => {
    if (!urlInput.trim()) { toast.error('Please enter an image URL'); return; }
    onInsert(urlInput.trim(), altText.trim() || undefined);
    onClose();
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File exceeds 5MB limit'); return; }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadInsert = () => {
    if (!uploadPreview) { toast.error('Please select an image first'); return; }
    onInsert(uploadPreview, altText.trim() || undefined);
    onClose();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const searchUnsplash = useCallback(async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=12`,
        { headers: { Authorization: 'Client-ID UNSPLASH_ACCESS_KEY' } }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUnsplashResults(data.results || []);
      if (data.results?.length === 0) toast.error('No images found');
    } catch {
      // Fallback: show placeholder results for demo
      setUnsplashResults(
        Array.from({ length: 6 }, (_, i) => ({
          id: `demo-${i}`,
          urls: { small: `https://picsum.photos/seed/${unsplashQuery}${i}/400/300` },
          alt_description: `${unsplashQuery} image ${i + 1}`,
          user: { name: 'Photographer' },
        }))
      );
    } finally {
      setUnsplashLoading(false);
    }
  }, [unsplashQuery]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="glass-strong rounded-2xl border border-white/10 w-full max-w-lg mx-4 overflow-hidden shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FiImageIcon size={18} className="text-[var(--editor-active)]" />
            <h2 className="text-white font-medium text-sm">Insert Image</h2>
          </div>
          <button
            onMouseDown={(e) => { e.preventDefault(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onMouseDown={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-[var(--editor-active)] border-b-2 border-[var(--editor-active)] bg-[var(--editor-active-bg)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[400px] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'url' && (
              <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUrlInsert()}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-[var(--editor-active)]/50 transition-colors"
                  autoFocus
                />
                <input
                  type="text"
                  value={altText}
                  onChange={e => setAltText(e.target.value)}
                  placeholder="Alt text (optional)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-[var(--editor-active)]/50 transition-colors"
                />
                {urlInput && (
                  <div className="relative rounded-xl overflow-hidden border border-white/5 bg-white/5 aspect-video flex items-center justify-center">
                    <img
                      src={urlInput}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                    />
                  </div>
                )}
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleUrlInsert(); }}
                  className="w-full py-2.5 rounded-xl bg-[var(--editor-active)] text-white text-sm font-medium hover:opacity-90 transition-all"
                >
                  Insert Image
                </button>
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragOver ? 'border-[var(--editor-active)] bg-[var(--editor-active-bg)]' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <FiUpload size={32} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/50 text-sm mb-2">Drag & drop an image here</p>
                  <p className="text-white/20 text-xs mb-4">JPEG, PNG, GIF, WebP, SVG max 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-all"
                  >
                    Browse Files
                  </button>
                </div>
                {uploadPreview && (
                  <div className="relative rounded-xl overflow-hidden border border-white/5">
                    <img src={uploadPreview} alt="Uploaded preview" className="w-full max-h-48 object-contain bg-white/5" />
                  </div>
                )}
                {uploadPreview && (
                  <>
                    <input
                      type="text"
                      value={altText}
                      onChange={e => setAltText(e.target.value)}
                      placeholder="Alt text (optional)"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-[var(--editor-active)]/50 transition-colors"
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleUploadInsert(); }}
                      className="w-full py-2.5 rounded-xl bg-[var(--editor-active)] text-white text-sm font-medium hover:opacity-90 transition-all"
                    >
                      Insert Image
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'cloud' && (
              <motion.div key="cloud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="rounded-xl bg-white/5 p-8 text-center">
                  <FiCloud size={40} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/50 text-sm">Connect cloud storage to browse your images</p>
                  <p className="text-white/20 text-xs mt-2">Coming soon</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'unsplash' && (
              <motion.div key="unsplash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={unsplashQuery}
                    onChange={e => setUnsplashQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                    placeholder="Search free images..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-[var(--editor-active)]/50 transition-colors"
                    autoFocus
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); searchUnsplash(); }}
                    disabled={unsplashLoading}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-all disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>

                {unsplashLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[var(--editor-active)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!unsplashLoading && unsplashResults.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {unsplashResults.map((img: any) => (
                      <button
                        key={img.id}
                        onMouseDown={(e) => { e.preventDefault(); onInsert(img.urls.small, img.alt_description || ''); onClose(); }}
                        className="relative rounded-xl overflow-hidden border border-white/5 hover:border-[var(--editor-active)]/50 transition-all group aspect-[4/3]"
                      >
                        <img src={img.urls.small} alt={img.alt_description || ''} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded-lg">
                            Insert
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!unsplashLoading && unsplashResults.length === 0 && !unsplashQuery && (
                  <p className="text-white/30 text-sm text-center py-8">Search millions of free images</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
