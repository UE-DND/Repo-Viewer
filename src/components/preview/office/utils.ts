import { OfficeFileType } from './types';

/**
 * 根据文件类型获取文件类型显示名称
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
 * 检测是否为移动设备
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 生成预览URL
 */
export const generatePreviewUrl = (fileUrl: string, isBackup: boolean = false): string => {
  const safeUrl = encodeURIComponent(fileUrl);
  const baseUrl = isBackup 
    ? "https://view.officeapps.live.com/op/embed.aspx?src="
    : "https://view.officeapps.live.com/op/view.aspx?src=";
  return `${baseUrl}${safeUrl}`;
};