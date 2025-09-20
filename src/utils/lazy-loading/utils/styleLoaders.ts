/**
 * 动态导入 katex 样式的工具函数
 * 仅在需要时才加载 katex CSS，避免首屏加载
 */
export const loadKatexStyles = (() => {
  let loaded = false;
  let loadPromise: Promise<void> | null = null;

  return (): Promise<void> => {
    if (loaded) {
      return Promise.resolve();
    }

    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingLink = document.querySelector('link[href*="katex.min.css"]');
      if (existingLink) {
        loaded = true;
        resolve();
        return;
      }

      // 动态创建 link 标签加载 katex CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      
      link.onload = () => {
        loaded = true;
        resolve();
      };
      
      link.onerror = () => {
        loadPromise = null; // 允许重试
        reject(new Error('Failed to load KaTeX styles'));
      };

      document.head.appendChild(link);
    });

    return loadPromise;
  };
})();

/**
 * 通用的动态样式加载器
 * @param href 样式文件URL
 * @param id 可选的唯一标识符，用于避免重复加载
 * @returns Promise<void>
 */
export const loadStylesheet = (href: string, id?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    const selector = id ? `link[data-style-id="${id}"]` : `link[href="${href}"]`;
    const existingLink = document.querySelector(selector);
    
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) {
      link.setAttribute('data-style-id', id);
    }
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));

    document.head.appendChild(link);
  });
};
