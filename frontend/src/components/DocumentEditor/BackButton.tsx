import { createPortal } from 'react-dom';
import { FiChevronLeft } from 'react-icons/fi';

interface BackButtonProps {
  onClick: () => void;
  whitePage?: boolean;
}

export default function BackButton({ onClick, whitePage }: BackButtonProps) {
  return createPortal(
    <button
      onClick={onClick}
      type="button"
      className={`
        fixed top-4 left-4 z-[99999] cursor-pointer
        flex items-center gap-2 px-4 py-2.5 text-sm
        rounded-2xl border backdrop-blur-xl
        transition-all duration-300
        hover:scale-105 active:scale-95
        shadow-2xl select-none
        ${whitePage
          ? 'text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-400 bg-white/80'
          : 'text-white/60 hover:text-cyan border-white/5 hover:border-cyan/30 bg-white/5 hover:bg-white/10'
        }
      `}
      style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
    >
      <FiChevronLeft size={18} className="shrink-0" />
      <span className="hidden sm:inline font-medium">Back to Files</span>
    </button>,
    document.body
  );
}
