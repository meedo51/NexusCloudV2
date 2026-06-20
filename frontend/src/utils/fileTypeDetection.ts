export type FileCategory =
  | 'code' | 'document' | 'image' | 'video' | 'audio' | 'archive'
  | 'config' | 'database' | 'font' | 'certificate' | 'executable'
  | 'text' | 'unknown';

export interface FileTypeInfo {
  extension: string;
  category: FileCategory;
  label: string;
  color: string;
  icon: string;
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function getFileName(filename: string): string {
  return filename.split('/').pop()?.split('\\').pop() || filename;
}

export function detectByMime(mime: string | undefined): string | null {
  if (!mime) return null;
  const map: Record<string, string> = {
    'application/javascript': 'js',
    'application/typescript': 'ts',
    'application/json': 'json',
    'application/xml': 'xml',
    'application/x-yaml': 'yaml',
    'application/x-sh': 'sh',
    'application/x-python': 'py',
    'application/x-httpd-php': 'php',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/x-tar': 'tar',
    'application/gzip': 'gz',
    'application/x-bzip2': 'bz2',
    'application/x-iso9660-image': 'iso',
    'application/vnd.apple.diskimage': 'dmg',
    'application/x-msdownload': 'exe',
    'application/vnd.android.package-archive': 'apk',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/vnd.adobe.photoshop': 'psd',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/x-m4a': 'm4a',
    'video/mp4': 'mp4',
    'video/x-msvideo': 'avi',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
    'text/csv': 'csv',
    'text/calendar': 'ics',
    'text/x-markdown': 'md',
    'text/x-tex': 'tex',
    'text/x-rust': 'rs',
    'text/x-go': 'go',
    'text/x-java': 'java',
    'text/x-csrc': 'c',
    'text/x-c++src': 'cpp',
    'text/x-csharp': 'cs',
    'text/x-ruby': 'rb',
    'text/x-swift': 'swift',
    'text/x-kotlin': 'kt',
    'text/x-dart': 'dart',
    'text/x-lua': 'lua',
    'text/x-sql': 'sql',
    'text/x-dockerfile': 'dockerfile',
    'font/ttf': 'ttf',
    'font/otf': 'otf',
    'font/woff': 'woff',
    'font/woff2': 'woff2',
  };
  const base = mime.split(';')[0].toLowerCase();
  return map[base] || null;
}

export function detectByFilename(name: string): string | null {
  const special: Record<string, string> = {
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'gemfile': 'gemfile',
    '.gitignore': 'gitignore',
    '.env': 'env',
    '.editorconfig': 'editorconfig',
    '.prettierrc': 'prettierrc',
    '.eslintrc': 'eslintrc',
    'readme.md': 'readme',
    'license': 'license',
    'license.md': 'license',
    'changelog.md': 'changelog',
    'contributing.md': 'contributing',
  };
  return special[name.toLowerCase()] || null;
}

export function detectFileType(name: string, mime?: string): { ext: string; label: string } {
  const basename = getFileName(name);
  const special = detectByFilename(basename);
  if (special) return { ext: special, label: special.toUpperCase() };
  const fromMime = detectByMime(mime);
  if (fromMime) return { ext: fromMime, label: fromMime.toUpperCase() };
  const ext = getExtension(basename);
  return { ext, label: ext.toUpperCase() || 'FILE' };
}
