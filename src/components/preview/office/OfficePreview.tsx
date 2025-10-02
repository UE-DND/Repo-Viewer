import React from "react";
import { useMediaQuery } from "@mui/material";
import MobileOfficePreview from "./MobileOfficePreview";
import DesktopOfficePreview from "./DesktopOfficePreview";
import type { OfficePreviewProps } from "./types";
import { isMobileDevice } from "./utils";

/**
 * Office文档预览组件
 * 根据设备类型自动选择合适的预览组件
 * - 移动设备：显示特殊的提示界面，支持跳转到外部浏览器
 * - 桌面设备：使用iframe嵌入微软Office在线预览服务
 */
const OfficePreview: React.FC<OfficePreviewProps> = (props) => {
  const isSmallScreen = useMediaQuery("(max-width:768px)");
  const isMobile = isMobileDevice() || isSmallScreen;

  // 根据设备类型渲染不同的组件
  if (isMobile) {
    return <MobileOfficePreview {...props} />;
  }

  return <DesktopOfficePreview {...props} />;
};

export default OfficePreview;

// 导出类型和枚举供外部使用
export { OfficeFileType } from './types';
export type { OfficePreviewProps } from './types';