import { useMemo } from 'react';
import { detectFileType } from '../../../utils/fileTypeDetection';
import { getFileIconConfig, type FileIconConfig } from '../../../utils/fileIconMapping';

interface UseFileIconResult {
  config: FileIconConfig;
  ext: string;
}

export function useFileIcon(filename: string, mime?: string): UseFileIconResult {
  return useMemo(() => {
    const { ext } = detectFileType(filename, mime);
    const config = getFileIconConfig(ext);
    return { config, ext };
  }, [filename, mime]);
}
