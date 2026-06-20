import type { Editor } from '@tiptap/react';
import {
  FiTrash2, FiPlus, FiMinus,
  FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight,
  FiColumns, FiTable,
} from 'react-icons/fi';

interface TablePropertiesProps {
  editor: Editor;
}

export default function TableProperties({ editor }: TablePropertiesProps) {
  const addRowAbove = () => editor.chain().focus().addRowBefore().run();
  const addRowBelow = () => editor.chain().focus().addRowAfter().run();
  const addColumnLeft = () => editor.chain().focus().addColumnBefore().run();
  const addColumnRight = () => editor.chain().focus().addColumnAfter().run();
  const deleteRow = () => editor.chain().focus().deleteRow().run();
  const deleteColumn = () => editor.chain().focus().deleteColumn().run();
  const deleteTable = () => editor.chain().focus().deleteTable().run();
  const mergeCells = () => editor.chain().focus().mergeCells().run();
  const splitCell = () => editor.chain().focus().splitCell().run();
  const toggleHeader = () => editor.chain().focus().toggleHeaderCell().run();

  return (
    <div className="glass-strong rounded-xl border border-white/10 p-1.5 shadow-2xl whitespace-nowrap flex items-center gap-0.5">
      <span className="text-[10px] text-white/30 px-1">Row</span>
      <button
        onMouseDown={(e) => { e.preventDefault(); addRowAbove(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Insert row above"
      >
        <FiChevronUp size={13} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); addRowBelow(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Insert row below"
      >
        <FiChevronDown size={13} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); deleteRow(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Delete row"
      >
        <FiTrash2 size={12} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <span className="text-[10px] text-white/30 px-1">Col</span>
      <button
        onMouseDown={(e) => { e.preventDefault(); addColumnLeft(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Insert column left"
      >
        <FiChevronLeft size={13} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); addColumnRight(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Insert column right"
      >
        <FiChevronRight size={13} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); deleteColumn(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Delete column"
      >
        <FiTrash2 size={12} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <span className="text-[10px] text-white/30 px-1">Cell</span>
      <button
        onMouseDown={(e) => { e.preventDefault(); mergeCells(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Merge cells"
      >
        <FiPlus size={14} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); splitCell(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Split cell"
      >
        <FiMinus size={14} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <button
        onMouseDown={(e) => { e.preventDefault(); toggleHeader(); }}
        className="p-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Toggle header"
      >
        <FiTable size={14} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); deleteTable(); }}
        className="p-1.5 rounded-lg text-sm text-red/50 hover:text-red hover:bg-red/10 transition-all"
        title="Delete table"
      >
        <FiTrash2 size={14} />
      </button>
    </div>
  );
}
