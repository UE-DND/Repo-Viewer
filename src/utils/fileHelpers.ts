import {
  Folder as FolderIcon, 
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
export const fileExtensionIcons: { [key: string]: React.ElementType } = {
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
  py: CodeIcon, java: CodeIcon, c: CodeIcon, cpp: CodeIcon
};

// 获取文件图标
export const getFileIcon = (filename: string): React.ElementType => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && fileExtensionIcons[extension]) {
    return fileExtensionIcons[extension];
  }
  return FileIcon; 
};

// 检查是否为图像文件
export const isImageFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension) : false;
};

// 检查是否为PDF文件
export const isPdfFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
};

// 检查是否为Markdown文件
export const isMarkdownFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'md';
}; 