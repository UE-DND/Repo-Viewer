/**
 * 预加载预览组件（在空闲时间进行）
 * 使用智能策略在浏览器空闲时预加载常用组件
 */
export const preloadPreviewComponents = () => {
  // 使用 requestIdleCallback 或 setTimeout 在空闲时预加载
  const idleCallback = (window as any).requestIdleCallback || 
    ((cb: () => void) => setTimeout(cb, 1));

  idleCallback(() => {
    // 预加载常用的预览组件
    import('../../../components/preview/markdown').catch(() => {
      // 预加载失败是可接受的，不影响用户体验
      console.debug('预加载 Markdown 预览组件失败');
    });
    
    import('../../../components/preview/image').catch(() => {
      // 预加载失败是可接受的
      console.debug('预加载图片预览组件失败');
    });

    // Office 预览组件较大，根据使用频率决定是否预加载
    import('../../../components/preview/office').catch(() => {
      console.debug('预加载 Office 预览组件失败');
    });
  });
};

/**
 * 预加载指定的组件
 * @param componentPaths 要预加载的组件路径数组
 * @param options 预加载选项
 */
export const preloadComponents = (
  componentPaths: string[],
  options: {
    /** 预加载延迟时间（毫秒） */
    delay?: number;
    /** 是否在空闲时间执行 */
    useIdleCallback?: boolean;
  } = {}
) => {
  const { delay = 0, useIdleCallback = true } = options;

  const executePreload = () => {
    componentPaths.forEach((path) => {
      import(/* @vite-ignore */ path).catch((error) => {
        console.debug(`预加载组件失败: ${path}`, error);
      });
    });
  };

  if (delay > 0) {
    setTimeout(() => {
      if (useIdleCallback && (window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(executePreload);
      } else {
        executePreload();
      }
    }, delay);
  } else if (useIdleCallback && (window as any).requestIdleCallback) {
    (window as any).requestIdleCallback(executePreload);
  } else {
    executePreload();
  }
};
