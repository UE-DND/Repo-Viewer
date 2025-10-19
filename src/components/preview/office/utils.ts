import { OfficeFileType } from './types';

/**
 * 获取文件类型名称
 * 
 * @param fileType - Office文件类型枚举
 * @returns 文件类型的显示名称
 */
export const getFileTypeName = (fileType: OfficeFileType): string => {
  switch (fileType) {
    case OfficeFileType.WORD:
      return "Word";
    case OfficeFileType.EXCEL:
      return "Excel";
    case OfficeFileType.PPT:
      return "PPT";
    default:
      return "Office";
  }
};

/**
 * 检查是否为移动设备
 * 
 * @returns 如果是移动设备返回true
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 生成Office预览URL
 * 
 * 使用Microsoft Office在线预览服务生成预览链接。
 * 
 * @param fileUrl - Office文件的URL
 * @param isBackup - 是否使用备用URL，默认为false
 * @returns 预览服务URL
 */
export const generatePreviewUrl = (fileUrl: string, isBackup = false): string => {
  const safeUrl = encodeURIComponent(fileUrl);
  const baseUrl = isBackup
    ? "https://view.officeapps.live.com/op/embed.aspx?src="
    : "https://view.officeapps.live.com/op/view.aspx?src=";
  return `${baseUrl}${safeUrl}`;
};
