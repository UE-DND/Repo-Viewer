/**
 * G3曲线工具函数
 * G3曲线提供比普通圆角更平滑的连续性，具有连续的曲率变化
 * 通过CSS的border-radius和clip-path结合实现G3曲线效果
 */

/**
 * 配置接口
 */
export interface G3CurveConfig {
  /** 基础半径大小 */
  radius: number;
  /** 曲率平滑度 (0-1，越大越平滑) */
  smoothness?: number;
}

/**
 * 默认曲线配置
 */
const DEFAULT_G3_CONFIG: Required<G3CurveConfig> = {
  radius: 16,
  smoothness: 0.6,
};

export function createG3BorderRadius(config: G3CurveConfig): string {
  const { radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;
  const adjustedRadius = radius * (1.0 + smoothness * 0.6);
  return `${Math.round(adjustedRadius).toString()}px`;
}

// 生成样式对象
export function createG3Style(config: G3CurveConfig): React.CSSProperties {
  const { radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;
  const g3Radius = createG3BorderRadius(config);
  return {
    borderRadius: g3Radius,
    '--g3-radius': `${radius.toString()}px`,
    '--g3-smoothness': smoothness.toString(),
    transition: 'border-radius 0.2s ease-out, box-shadow 0.2s ease-out',
  } as React.CSSProperties;
}

// 预定义的曲线配置
export const G3_PRESETS = {
  // 文件列表项
  fileListItem: {
    radius: 14,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 文件列表容器
  fileListContainer: {
    radius: 20,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 卡片
  card: {
    radius: 20,
    smoothness: 0.5,
  } as G3CurveConfig,

  // 按钮
  button: {
    radius: 24,
    smoothness: 0.8,
  } as G3CurveConfig,

  // 对话框
  dialog: {
    radius: 28,
    smoothness: 0.4,
  } as G3CurveConfig,

  // 图片
  image: {
    radius: 16,
    smoothness: 0.6,
  } as G3CurveConfig,

  // 面包屑导航
  breadcrumb: {
    radius: 28,
    smoothness: 1.0,
  } as G3CurveConfig,

  // 面包屑项
  breadcrumbItem: {
    radius: 28,
    smoothness: 1.0,
  } as G3CurveConfig,

  // 提示框
  tooltip: {
    radius: 16,
    smoothness: 0.5,
  } as G3CurveConfig,

  // 骨架线条
  skeletonLine: {
    radius: 8,
    smoothness: 0.8,
  } as G3CurveConfig,
} as const;

export const g3Styles = {
  fileListItem: () => createG3Style(G3_PRESETS.fileListItem),
  fileListContainer: () => createG3Style(G3_PRESETS.fileListContainer),
  card: () => createG3Style(G3_PRESETS.card),
  button: () => createG3Style(G3_PRESETS.button),
  dialog: () => createG3Style(G3_PRESETS.dialog),
  image: () => createG3Style(G3_PRESETS.image),
  breadcrumb: () => createG3Style(G3_PRESETS.breadcrumb),
  breadcrumbItem: () => createG3Style(G3_PRESETS.breadcrumbItem),
  tooltip: () => createG3Style(G3_PRESETS.tooltip),
  skeletonLine: () => createG3Style(G3_PRESETS.skeletonLine),
};

// 响应式曲线工具函数
export function createResponsiveG3Style(
  desktopConfig: G3CurveConfig,
  mobileConfig?: Partial<G3CurveConfig>
): { desktop: React.CSSProperties; mobile: React.CSSProperties } {
  const mobile = { ...desktopConfig, ...mobileConfig };

  return {
    desktop: createG3Style(desktopConfig),
    mobile: createG3Style(mobile),
  };
}

/**
 * 响应式圆角配置接口
 */
export interface ResponsiveG3Config {
  desktop: G3CurveConfig;
  mobile: G3CurveConfig;
}

/**
 * 预定义的响应式圆角配置
 */
export const RESPONSIVE_G3_PRESETS = {
  // 文件列表容器 - 响应式
  fileListContainer: {
    desktop: { radius: 20, smoothness: 0.8 },
    mobile: { radius: 16, smoothness: 0.8 },
  } as ResponsiveG3Config,

  // README预览容器 - 响应式
  readmeContainer: {
    desktop: { radius: 20, smoothness: 0.8 },
    mobile: { radius: 16, smoothness: 0.8 },
  } as ResponsiveG3Config,

  // 卡片 - 响应式
  card: {
    desktop: { radius: 20, smoothness: 0.5 },
    mobile: { radius: 16, smoothness: 0.5 },
  } as ResponsiveG3Config,
} as const;

/**
 * 获取响应式圆角样式
 */
export function getResponsiveG3BorderRadius(
  preset: ResponsiveG3Config,
  isSmallScreen: boolean
): string {
  const config = isSmallScreen ? preset.mobile : preset.desktop;
  return createG3BorderRadius(config);
}

/**
 * 响应式G3样式工具集
 */
export const responsiveG3Styles = {
  fileListContainer: (isSmallScreen: boolean) => 
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.fileListContainer, isSmallScreen),
  readmeContainer: (isSmallScreen: boolean) => 
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.readmeContainer, isSmallScreen),
  card: (isSmallScreen: boolean) => 
    getResponsiveG3BorderRadius(RESPONSIVE_G3_PRESETS.card, isSmallScreen),
};

// Emotion styled-components
export function g3BorderRadius(config: G3CurveConfig): string {
  return createG3BorderRadius(config);
}

// Material-UI sx prop
export function g3Sx(config: G3CurveConfig): React.CSSProperties {
  return createG3Style(config);
}
