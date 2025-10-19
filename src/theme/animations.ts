import { keyframes } from '@mui/system';

/**
 * 旋转动画
 * 
 * 用于刷新按钮的旋转效果。
 */
export const rotateAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

/**
 * 脉冲动画
 * 
 * 用于主题切换按钮的缩放脉冲效果。
 */
export const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

/**
 * 刷新动画
 * 
 * 组合旋转和缩放效果，用于刷新按钮。
 */
export const refreshAnimation = keyframes`
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.1);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
`;

/**
 * 淡入动画
 * 
 * 元素渐变显示效果。
 */
export const fadeAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

/**
 * 淡出动画
 * 
 * 元素渐变消失效果。
 */
export const fadeOutAnimation = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

/**
 * 弹跳动画
 * 
 * 垂直弹跳效果，用于吸引用户注意。
 */
export const bounceAnimation = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
`;

/**
 * 浮动动画
 * 
 * 轻微浮动效果，用于FAB按钮。
 */
export const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-2px);
  }
`;

/**
 * 缩放进入动画
 * 
 * 元素放大淡入效果，用于空状态组件。
 */
export const scaleInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;