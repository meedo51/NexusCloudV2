import { memo } from 'react';
import type { IconSize } from './FileIcon';

export type FolderType = 'default' | 'open' | 'shared' | 'starred' | 'trash';
export type FolderColor =
  | 'default' | 'documents' | 'images' | 'videos' | 'music'
  | 'code' | 'archives' | 'shared' | 'starred' | 'trash';

interface FolderIconProps {
  type?: FolderType;
  color?: FolderColor;
  size?: IconSize | number;
  className?: string;
  count?: number;
  animated?: boolean;
}

const COLOR_MAP: Record<FolderColor, { fill: string; stroke: string }> = {
  default:   { fill: '#4A9EFF18', stroke: '#4A9EFF' },
  documents: { fill: '#34D39918', stroke: '#34D399' },
  images:    { fill: '#EC489918', stroke: '#EC4899' },
  videos:    { fill: '#8B5CF618', stroke: '#8B5CF6' },
  music:     { fill: '#FB923C18', stroke: '#FB923C' },
  code:      { fill: '#06B6D418', stroke: '#06B6D4' },
  archives:  { fill: '#FBBF2418', stroke: '#FBBF24' },
  shared:    { fill: '#14B8A618', stroke: '#14B8A6' },
  starred:   { fill: '#F59E0B18', stroke: '#F59E0B' },
  trash:     { fill: '#EF444418', stroke: '#EF4444' },
};

const SIZE_MAP: Record<string, number> = { xs: 16, sm: 20, md: 24, lg: 32, xl: 48 };

const FolderIcon = memo(function FolderIcon({
  type = 'default', color = 'default', size = 'md', className = '', count, animated = true,
}: FolderIconProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 24;
  const { fill, stroke } = COLOR_MAP[color];
  const s = px / 48;

  return (
    <span
      className={`inline-flex items-center justify-center relative ${animated ? 'icon-hover' : ''} ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`${type} folder`}
    >
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none">
        {type === 'open' ? (
          <>
            <path d="M6 12a4 4 0 014-4h10l4 4h14a4 4 0 014 4v4H6V12z" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <path d="M6 20l5 18h28l5-18H6z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          </>
        ) : type === 'shared' ? (
          <>
            <path d="M6 14a4 4 0 014-4h10l4 4h14a4 4 0 014 4v16a4 4 0 01-4 4H10a4 4 0 01-4-4V14z" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <circle cx="24" cy="24" r="3" fill={stroke} opacity="0.7" />
            <path d="M18 30c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
          </>
        ) : type === 'starred' ? (
          <>
            <path d="M6 14a4 4 0 014-4h10l4 4h14a4 4 0 014 4v16a4 4 0 01-4 4H10a4 4 0 01-4-4V14z" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <path d="M24 16l2.5 5 5.5.8-4 3.9.9 5.6L24 29l-5 2.4.9-5.6-4-3.9 5.5-.8L24 16z" fill={stroke} opacity="0.8" />
          </>
        ) : type === 'trash' ? (
          <>
            <path d="M6 14a4 4 0 014-4h10l4 4h14a4 4 0 014 4v16a4 4 0 01-4 4H10a4 4 0 01-4-4V14z" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <line x1="16" y1="22" x2="16" y2="34" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="24" y1="22" x2="24" y2="34" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="22" x2="32" y2="34" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="14" r="3" fill={stroke} opacity="0.3" />
          </>
        ) : (
          <path d="M6 14a4 4 0 014-4h10l4 4h14a4 4 0 014 4v16a4 4 0 01-4 4H10a4 4 0 01-4-4V14z" fill={fill} stroke={stroke} strokeWidth="1.5" />
        )}
      </svg>
      {count !== undefined && (
        <span
          className="absolute -top-1 -right-1 text-[9px] font-bold leading-none px-1 rounded-full"
          style={{ backgroundColor: stroke, color: '#0B0F19' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
});

export default FolderIcon;
