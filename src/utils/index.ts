// 导出文件相关工具
export * from './fileHelpers';

// 导出格式化工具
export * from './formatters';

// 导出日志工具
export { logger } from './logger';

// 导出代理工具
export { getProxiedUrl } from './proxyHelper';

// 导出其他实用工具
export * from './token-helper';
export * from './eventEmitter';

// 添加防抖函数
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

// 图像处理工具
export const isImageFile = (fileName: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const lowerCaseFileName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};

// PDF处理工具
export const isPdfFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.pdf');
};

// Markdown处理工具
export const isMarkdownFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.md');
};

// Word文档处理工具
export const isWordFile = (fileName: string): boolean => {
  const wordExtensions = ['.doc', '.docx', '.docm'];
  const lowerCaseFileName = fileName.toLowerCase();
  return wordExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};

// Excel文档处理工具
export const isExcelFile = (fileName: string): boolean => {
  const excelExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb', '.csv'];
  const lowerCaseFileName = fileName.toLowerCase();
  return excelExtensions.some(ext => lowerCaseFileName.endsWith(ext));
};

// PowerPoint文档处理工具
export const isPPTFile = (fileName: string): boolean => {
  const pptExtensions = ['.ppt', '.pptx', '.pptm', '.pps', '.ppsx'];
  const lowerCaseFileName = fileName.toLowerCase();
  return pptExtensions.some(ext => lowerCaseFileName.endsWith(ext));
}; 