/**
 * LaTeX渲染优化工具
 * 用于优化在主题切换时LaTeX公式的渲染性能
 */

import { logger } from '../logging/logger';

// 定义防抖函数，避免循环引用
const debounce = <F extends (...args: any[]) => any>(
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

// 存储临时移除的LaTeX元素
type StoredElement = {
  element: HTMLElement;
  parent: HTMLElement;
  nextSibling: Node | null;
  container: HTMLElement;
};

let storedElements: StoredElement[] = [];
let isThemeChanging = false;

// 彻底移除所有LaTeX元素，而不只是隐藏它们
export const removeLatexElements = (): void => {
  if (isThemeChanging) return; // 避免重复移除
  
  isThemeChanging = true;
  storedElements = [];
  
  // 获取所有LaTeX容器
  const containers = document.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)');
  let count = 0;
  
  containers.forEach(container => {
    const parent = container.parentElement;
    if (!parent) return;
    
    const element = container as HTMLElement;
    const nextSibling = container.nextSibling;
    
    // 存储元素，以便之后恢复
    storedElements.push({
      element,
      parent,
      nextSibling,
      container: element.cloneNode(false) as HTMLElement
    });
    
    // 替换为占位符元素，保持布局稳定
    const placeholder = document.createElement('div');
    placeholder.classList.add('latex-placeholder');
    placeholder.style.height = `${element.offsetHeight}px`;
    placeholder.style.width = `${element.offsetWidth}px`;
    placeholder.style.display = 'inline-block';
    placeholder.style.visibility = 'hidden';
    
    // 从DOM中移除原始元素
    parent.replaceChild(placeholder, element);
    count++;
  });
  
  if (count > 0) {
    logger.debug(`已移除 ${count} 个LaTeX元素以优化主题切换性能`);
  }
};

// 分批恢复LaTeX元素
export const restoreLatexElements = (): void => {
  if (!isThemeChanging || storedElements.length === 0) return;
  
  const BATCH_SIZE = 10; // 每批恢复的元素数量
  const BATCH_DELAY = 50; // 批次间延迟(ms)
  
  const batchedRestore = (startIndex: number) => {
    // 批量恢复，逐步降低对主线程的压力
    const endIndex = Math.min(startIndex + BATCH_SIZE, storedElements.length);
    
    // 处理当前批次
    for (let i = startIndex; i < endIndex; i++) {
      const entry = storedElements[i];
      if (!entry) continue;
      const { element, parent, nextSibling } = entry;
      
      // 查找占位符
      const placeholders = parent.querySelectorAll('.latex-placeholder');
      let placeholder: HTMLElement | null = null;
      
      // 尝试恢复到原位置
      for (let j = 0; j < placeholders.length; j++) {
        placeholder = placeholders[j] as HTMLElement;
        if (placeholder) {
          parent.replaceChild(element, placeholder);
          break;
        }
      }
      
      // 如果没有找到占位符，则尝试使用原始位置信息
      if (!placeholder) {
        if (nextSibling) {
          parent.insertBefore(element, nextSibling);
        } else {
          parent.appendChild(element);
        }
      }
    }
    
    // 递归处理下一批
    if (endIndex < storedElements.length) {
      setTimeout(() => batchedRestore(endIndex), BATCH_DELAY);
    } else {
      // 全部恢复完成
      storedElements = [];
      isThemeChanging = false;
      logger.debug('已完成所有LaTeX元素的恢复');
    }
  };
  
  // 开始批量恢复
  setTimeout(() => batchedRestore(0), 100);
};

// 隐藏所有LaTeX元素，减少主题切换时的卡顿 (保留为后备方案)
export const hideLatexElements = (): void => {
  // 使用更激进的方式完全移除元素
  removeLatexElements();
};

// 显示所有LaTeX元素 (保留为后备方案)
export const showLatexElements = (): void => {
  // 使用批量恢复方法
  restoreLatexElements();
};

// 优化版的批量处理函数
export const debouncedShowLatexElements = debounce(restoreLatexElements, 100);

// 检测页面中LaTeX元素的数量
export const countLatexElements = (): number => {
  return document.querySelectorAll('.katex-display, .katex:not(.katex-display .katex)').length;
};

// 添加必要的CSS样式
const addLatexOptimizerStyles = () => {
  // 如果样式已存在，则不重复添加
  if (document.getElementById('latex-optimizer-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'latex-optimizer-styles';
  styleElement.textContent = `
    .latex-placeholder {
      min-height: 1.2em;
      margin: 0.5em 0;
      background: transparent;
    }
    body.theme-transition .katex-display,
    body.theme-transition .katex {
      visibility: hidden !important;
      opacity: 0 !important;
      transition: none !important;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// 监听主题变化并优化LaTeX渲染
export const setupLatexOptimization = (): () => void => {
  // 添加必要的样式
  addLatexOptimizerStyles();
  
  // 创建MutationObserver监听data-theme变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === 'data-theme' &&
        mutation.target === document.documentElement
      ) {
        // 检测到主题变化时移除LaTeX元素
        removeLatexElements();
        
        // 延迟恢复LaTeX元素
        setTimeout(() => {
          debouncedShowLatexElements();
        }, 500);
      }
    });
  });
  
  // 开始监听
  observer.observe(document.documentElement, { attributes: true });
  
  // 返回清理函数
  return () => {
    observer.disconnect();
    const styleElement = document.getElementById('latex-optimizer-styles');
    if (styleElement) {
      styleElement.remove();
    }
  };
}; 