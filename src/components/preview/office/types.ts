// 从主 types 文件导入文件类型枚举
import { OfficeFileType } from '@/types';
export { OfficeFileType };

/**
 * Office预览组件属性接口
 */
export interface OfficePreviewProps {
  /**
   * 文档URL地址
   */
  fileUrl: string;

  /**
   * 文件类型
   */
  fileType: OfficeFileType;

  /**
   * 文件名
   */
  fileName: string;

  /**
   * 是否以全屏模式显示
   * @default false
   */
  isFullScreen?: boolean;

  /**
   * 关闭预览的回调函数
   */
  onClose?: () => void;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 自定义样式
   */
  style?: React.CSSProperties;
}