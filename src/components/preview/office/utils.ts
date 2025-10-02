import { OfficeFileType } from './types';

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

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const generatePreviewUrl = (fileUrl: string, isBackup = false): string => {
  const safeUrl = encodeURIComponent(fileUrl);
  const baseUrl = isBackup
    ? "https://view.officeapps.live.com/op/embed.aspx?src="
    : "https://view.officeapps.live.com/op/view.aspx?src=";
  return `${baseUrl}${safeUrl}`;
};
