import {
  Description as FileIcon,
  PictureAsPdf as PdfIcon,
  Article as MarkdownIcon,
  TextSnippet as TxtIcon,
  InsertDriveFile as DocIcon,
  Calculate as SpreadsheetIcon,
  Slideshow as PresentationIcon,
  Image as ImageIcon,
  Movie as VideoIcon,
  MusicNote as AudioIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

// 文件扩展名与图标映射
export const fileExtensionIcons: Record<string, React.ElementType> = {
  zip: ArchiveIcon, rar: ArchiveIcon, '7z': ArchiveIcon, tar: ArchiveIcon, gz: ArchiveIcon,
  pdf: PdfIcon,
  doc: DocIcon, docx: DocIcon,
  txt: TxtIcon,
  md: MarkdownIcon,
  xls: SpreadsheetIcon, xlsx: SpreadsheetIcon, csv: SpreadsheetIcon,
  ppt: PresentationIcon, pptx: PresentationIcon,
  jpg: ImageIcon, jpeg: ImageIcon, png: ImageIcon, gif: ImageIcon, bmp: ImageIcon, svg: ImageIcon,
  mp3: AudioIcon, wav: AudioIcon, ogg: AudioIcon,
  mp4: VideoIcon, avi: VideoIcon, mov: VideoIcon, mkv: VideoIcon,
  js: CodeIcon, ts: CodeIcon, jsx: CodeIcon, tsx: CodeIcon, html: CodeIcon, css: CodeIcon,
};

/**
 * 获取文件图标
 * 
 * 根据文件扩展名返回对应的Material-UI图标组件。
 * 
 * @param filename - 文件名
 * @returns 图标组件
 */
export const getFileIcon = (filename: string): React.ElementType => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (typeof extension === 'string' && extension.length > 0) {
    const icon = fileExtensionIcons[extension];
    if (typeof icon !== 'undefined') {
      return icon;
    }
  }
  return FileIcon;
};

/**
 * 检查是否为图像文件
 * 
 * @param filename - 文件名
 * @returns 如果是图像文件返回true
 */
export const isImageFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (typeof extension === 'string' && extension.length > 0) {
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension);
  }
  return false;
};

/**
 * 检查是否为PDF文件
 * 
 * @param filename - 文件名
 * @returns 如果是PDF文件返回true
 */
export const isPdfFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
};

/**
 * 检查是否为Markdown文件
 * 
 * @param filename - 文件名
 * @returns 如果是Markdown文件返回true
 */
export const isMarkdownFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'md';
};

/**
 * 检查是否为Word文档
 * 
 * @param fileName - 文件名
 * @returns 如果是Word文档返回true
 */
export const isWordFile = (fileName: string): boolean => {
  const wordExtensions = ['.doc', '.docx', '.docm'];
  const lowerCaseFileName = fileName.toLowerCase();
  return wordExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};

/**
 * 检查是否为Excel文档
 * 
 * @param fileName - 文件名
 * @returns 如果是Excel文档返回true
 */
export const isExcelFile = (fileName: string): boolean => {
  const excelExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb', '.csv'];
  const lowerCaseFileName = fileName.toLowerCase();
  return excelExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};

/**
 * 检查是否为PowerPoint文档
 * 
 * @param fileName - 文件名
 * @returns 如果是PowerPoint文档返回true
 */
export const isPPTFile = (fileName: string): boolean => {
  const pptExtensions = ['.ppt', '.pptx', '.pptm', '.pps', '.ppsx'];
  const lowerCaseFileName = fileName.toLowerCase();
  return pptExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};
