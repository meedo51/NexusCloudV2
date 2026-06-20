import { memo, useMemo } from 'react';
import { detectFileType } from '../../utils/fileTypeDetection';
import { getFileIconConfig } from '../../utils/fileIconMapping';
import { CATEGORY_ICONS } from './icons/SvgIcons';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface FileIconProps {
  filename: string;
  mime?: string;
  size?: IconSize | number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

const SIZE_MAP: Record<IconSize, number> = { xs: 16, sm: 20, md: 24, lg: 32, xl: 48 };

const FileIcon = memo(function FileIcon({
  filename, mime, size = 'md', color: colorOverride, className = '', showLabel, animated = true,
}: FileIconProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 24;

  const { config, ext } = useMemo(() => {
    const { ext: detectedExt } = detectFileType(filename, mime);
    const cfg = getFileIconConfig(detectedExt);
    return { config: cfg, ext: detectedExt };
  }, [filename, mime]);

  const color = colorOverride || config.color;
  const IconComp = CATEGORY_ICONS[config.category];

  return (
    <span
      className={`inline-flex items-center justify-center relative ${animated ? 'icon-hover' : ''} ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`${config.label} file`}
    >
      <IconComp size={px} color={color} />
      {showLabel && config.iconChar && px >= 40 && (
        <span
          className="absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none px-0.5 rounded"
          style={{ backgroundColor: `${color}33`, color }}
        >
          {config.iconChar}
        </span>
      )}
    </span>
  );
});

export default FileIcon;
