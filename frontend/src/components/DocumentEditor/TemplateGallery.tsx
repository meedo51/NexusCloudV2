import { motion } from 'framer-motion';
import { FiX, FiFileText } from 'react-icons/fi';
import type { DocumentTemplate } from '../../types';

interface TemplateGalleryProps {
  templates: DocumentTemplate[];
  onSelect: (template: DocumentTemplate) => void;
  onClose: () => void;
}

export default function TemplateGallery({ templates, onSelect, onClose }: TemplateGalleryProps) {
  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-strong rounded-2xl border border-white/10 p-6 w-[600px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-medium flex items-center gap-2">
            <FiFileText size={16} className="text-cyan" />
            New Document
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <FiX size={16} />
          </button>
        </div>

        {categories.map(category => (
          <div key={category} className="mb-6">
            <h4 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3 px-1">{category}</h4>
            <div className="grid grid-cols-2 gap-2">
              {templates.filter(t => t.category === category).map(template => (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(template)}
                  className="glass rounded-xl p-4 text-left border border-white/5 hover:border-cyan/30 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center mb-2 group-hover:bg-cyan/20 transition-colors">
                    <FiFileText size={16} className="text-cyan/60" />
                  </div>
                  <p className="text-white text-sm font-medium">{template.name}</p>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
