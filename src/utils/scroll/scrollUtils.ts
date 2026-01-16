/**
 * 滚动工具函数
 */

/**
 * 滚动到顶部配置选项
 */
export interface ScrollToTopOptions {
  /** 滚动动画持续时间（毫秒）**/
  duration?: number;
}

/**
 * 获取当前滚动位置
 */
export const getScrollTop = (): number => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }

  const pageOffset = window.pageYOffset;
  if (Number.isFinite(pageOffset)) {
    return pageOffset;
  }

  const docScrollTop = document.documentElement.scrollTop;
  if (Number.isFinite(docScrollTop)) {
    return docScrollTop;
  }

  return 0;
};

/**
 * 平滑滚动到页面顶部
 *
 * @param options - 滚动选项
 * @returns 返回一个 Promise，在滚动完成后 resolve
 */
export const scrollToTop = (options: ScrollToTopOptions = {}): Promise<void> => {
  const { duration = 800 } = options;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const startScrollTop = getScrollTop();

    if (startScrollTop === 0) {
      resolve();
      return;
    }

    const animateScroll = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentScrollTop = startScrollTop * (1 - easeOutQuart);

      window.scrollTo(0, currentScrollTop);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animateScroll);
  });
};
