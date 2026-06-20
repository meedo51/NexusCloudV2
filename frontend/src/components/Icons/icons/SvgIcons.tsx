import type { FileCategory } from '../../../utils/fileTypeDetection';

interface IconBaseProps {
  size?: number;
  color?: string;
  className?: string;
}

function DocBase({ size = 48, color, className }: IconBaseProps & { children?: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" ry="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" fill="none" stroke={color} strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

export function CodeIcon({ size = 48, color = '#00F0FF', className }: IconBaseProps) {
  const s = size / 48;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M16 20l-5 4 5 4M32 20l5 4-5 4M22 18l4 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentIcon({ size = 48, color = '#4A9EFF', className }: IconBaseProps) {
  const s = size / 48;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <rect x="14" y="18" width="20" height="2" rx="1" fill={color} opacity="0.7" />
      <rect x="14" y="24" width="16" height="2" rx="1" fill={color} opacity="0.5" />
      <rect x="14" y="30" width="18" height="2" rx="1" fill={color} opacity="0.6" />
      <rect x="14" y="36" width="10" height="2" rx="1" fill={color} opacity="0.4" />
    </svg>
  );
}

export function ImageIcon({ size = 48, color = '#EC4899', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <rect x="12" y="17" width="24" height="18" rx="3" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <circle cx="20" cy="25" r="3" fill={color} opacity="0.6" />
      <path d="M12 33l6-5 4 3 6-5 8 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

export function VideoIcon({ size = 48, color = '#8B5CF6', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <rect x="10" y="18" width="20" height="16" rx="3" fill={`${color}08`} stroke={color} strokeWidth="1.5" />
      <path d="M30 24l8-4v10l-8-4z" fill={color} opacity="0.7" />
    </svg>
  );
}

export function AudioIcon({ size = 48, color = '#FB923C', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M28 18v14a5 5 0 01-10 0V24" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 24l10-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="30" r="4" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function ArchiveIcon({ size = 48, color = '#FBBF24', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M12 18h24v4H12z" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <rect x="14" y="26" width="20" height="12" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <path d="M20 30h8M20 34h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function ConfigIcon({ size = 48, color = '#A78BFA', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <circle cx="24" cy="26" r="6" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <path d="M24 16v3M24 33v3M16 26h3M29 26h3" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function DatabaseIcon({ size = 48, color = '#34D399', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <ellipse cx="24" cy="20" rx="10" ry="4" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <path d="M14 20v10c0 2.2 4.5 4 10 4s10-1.8 10-4V20" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <path d="M14 25c0 2.2 4.5 4 10 4s10-1.8 10-4" stroke={color} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function FontIcon({ size = 48, color = '#F472B6', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <text x="24" y="30" textAnchor="middle" fill={color} fontSize="16" fontWeight="bold" fontFamily="serif">Aa</text>
    </svg>
  );
}

export function CertificateIcon({ size = 48, color = '#FCD34D', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M24 16l-3 3-4-1 1 4-3 3 4 3-1 4 4-1 3 3 3-3 4 1-1-4 3-3-4-3 1-4-4 1-3-3z" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <circle cx="24" cy="27" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

export function ExecutableIcon({ size = 48, color = '#EF4444', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M16 20l-4 6 4 6M32 20l4 6-4 6M22 18l4 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TextIcon({ size = 48, color = '#9CA3AF', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <line x1="16" y1="20" x2="32" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="16" y1="27" x2="28" y2="27" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="16" y1="34" x2="24" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function UnknownIcon({ size = 48, color = '#6B7280', className }: IconBaseProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="2" width="40" height="44" rx="6" fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      <path d="M32 6v8h8" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <circle cx="24" cy="26" r="8" stroke={color} strokeWidth="1.5" fill={`${color}08`} />
      <text x="24" y="30" textAnchor="middle" fill={color} fontSize="12" fontWeight="bold">?</text>
    </svg>
  );
}

export const CATEGORY_ICONS: Record<FileCategory, React.ComponentType<IconBaseProps>> = {
  code: CodeIcon,
  document: DocumentIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: AudioIcon,
  archive: ArchiveIcon,
  config: ConfigIcon,
  database: DatabaseIcon,
  font: FontIcon,
  certificate: CertificateIcon,
  executable: ExecutableIcon,
  text: TextIcon,
  unknown: UnknownIcon,
};
