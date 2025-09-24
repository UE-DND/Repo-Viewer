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
  /** 是否使用clip-path实现更精确的G3曲线 */
  useClipPath?: boolean;
}

/**
 * 默认曲线配置
 */
const DEFAULT_G3_CONFIG: Required<G3CurveConfig> = {
  radius: 16,
  smoothness: 0.6,
  useClipPath: false,
};

export function createG3BorderRadius(config: G3CurveConfig): string {
  const { radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;
  const adjustedRadius = radius * (1.0 + smoothness * 0.6);
  return `${Math.round(adjustedRadius)}px`;
}

export function createG3ClipPath(config: G3CurveConfig): string {
  const { radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;

  // 计算控制点
  const controlPoint1 = smoothness * 0.8;
  const controlPoint2 = 1 - smoothness * 0.5;

  // 生成近似曲线路径
  const path = `polygon(
    ${radius}px 0%,
    calc(100% - ${radius}px) 0%,
    calc(100% - ${radius * controlPoint1}px) ${radius * (1 - controlPoint2)}px,
    100% ${radius}px,
    100% calc(100% - ${radius}px),
    calc(100% - ${radius * (1 - controlPoint2)}px) calc(100% - ${radius * controlPoint1}px),
    calc(100% - ${radius}px) 100%,
    ${radius}px 100%,
    ${radius * controlPoint1}px calc(100% - ${radius * (1 - controlPoint2)}px),
    0% calc(100% - ${radius}px),
    0% ${radius}px,
    ${radius * (1 - controlPoint2)}px ${radius * controlPoint1}px
  )`;

  return path;
}

// 生成样式对象
export function createG3Style(config: G3CurveConfig): React.CSSProperties {
  const { useClipPath = DEFAULT_G3_CONFIG.useClipPath, radius, smoothness = DEFAULT_G3_CONFIG.smoothness } = config;

  if (useClipPath) {
    return {
      clipPath: createG3ClipPath(config),
      borderRadius: 0,
    };
  } else {
    const g3Radius = createG3BorderRadius(config);
    return {
      borderRadius: g3Radius,
      '--g3-radius': `${radius}px`,
      '--g3-smoothness': smoothness.toString(),
      transition: 'border-radius 0.2s ease-out, box-shadow 0.2s ease-out',
    } as React.CSSProperties;
  }
}

// 预定义的曲线配置
export const G3_PRESETS = {
  // 文件列表项
  fileListItem: {
    radius: 14,
    smoothness: 0.8,
    useClipPath: false,
  } as G3CurveConfig,

  // 文件列表容器
  fileListContainer: {
    radius: 20,
    smoothness: 0.8,
    useClipPath: false,
  } as G3CurveConfig,

  // 卡片
  card: {
    radius: 20,
    smoothness: 0.5,
    useClipPath: false,
  } as G3CurveConfig,

  // 按钮
  button: {
    radius: 24,
    smoothness: 0.8,
    useClipPath: false,
  } as G3CurveConfig,

  // 对话框
  dialog: {
    radius: 28,
    smoothness: 0.4,
    useClipPath: false,
  } as G3CurveConfig,

  // 图片
  image: {
    radius: 16,
    smoothness: 0.6,
    useClipPath: false,
  } as G3CurveConfig,

  // 面包屑导航
  breadcrumb: {
    radius: 22,
    smoothness: 0.7,
    useClipPath: false,
  } as G3CurveConfig,

  // 面包屑项
  breadcrumbItem: {
    radius: 12,
    smoothness: 0.6,
    useClipPath: false,
  } as G3CurveConfig,

  // 提示框
  tooltip: {
    radius: 16,
    smoothness: 0.5,
    useClipPath: false,
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

// Emotion styled-components
export function g3BorderRadius(config: G3CurveConfig): string {
  return createG3BorderRadius(config);
}

// Material-UI sx prop
export function g3Sx(config: G3CurveConfig) {
  return createG3Style(config);
}
