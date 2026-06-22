import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PDFNavigationProps {
  currentPage: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPageChange: (page: number) => void;
}

export default function PDFNavigation({
  currentPage, numPages, onPrev, onNext, onPageChange,
}: PDFNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={currentPage <= 1}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 disabled:opacity-20 transition-all"
      >
        <FiChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={numPages || 1}
          value={currentPage}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            if (v >= 1 && v <= numPages) onPageChange(v);
          }}
          className="w-12 text-center bg-white/10 rounded-lg px-1.5 py-1 text-xs text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-white/30 text-xs">/ {numPages}</span>
      </div>

      <button
        onClick={onNext}
        disabled={currentPage >= numPages}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 disabled:opacity-20 transition-all"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
