import { useRef, useCallback, useState } from 'react';

/**
 * 滚动数据点接口
 */
interface ScrollDataPoint {
  offset: number;
  time: number;
}

/**
 * 滚动速度计算选项
 */
export interface ScrollSpeedOptions {
  /**
   * 采样点数量，用于计算平均速度
   * @default 5
   */
  maxSamples?: number;
  
  /**
   * 滚动停止检测延迟（毫秒）
   * @default 150
   */
  scrollEndDelay?: number;
  
  /**
   * 快速滚动阈值（像素/毫秒）
   * @default 0.3
   */
  fastScrollThreshold?: number;
}

/**
 * 优化的滚动处理Hook
 * 
 * 提供高性能的滚动速度计算和状态管理。
 * 使用移动平均算法平滑速度计算，减少抖动。
 * 
 * @param options - 滚动配置选项
 * @returns 滚动状态和处理函数
 * 
 * @example
 * const { isScrolling, scrollSpeed, handleScroll } = useOptimizedScroll();
 * 
 * <FixedSizeList
 *   onScroll={handleScroll}
 * />
 */
export function useOptimizedScroll(options: ScrollSpeedOptions = {}): {
  isScrolling: boolean;
  scrollSpeed: number;
  isFastScrolling: boolean;
  handleScroll: (scrollOffset: number) => void;
  reset: () => void;
} {
  const {
    maxSamples = 5,
    scrollEndDelay = 150,
    fastScrollThreshold = 0.3
  } = options;
  
  // 滚动状态
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  
  // 滚动数据缓存
  const scrollDataRef = useRef<{
    positions: ScrollDataPoint[];
    timer: NodeJS.Timeout | null;
  }>({
    positions: [],
    timer: null
  });
  
  /**
   * 计算滚动速度
   * 
   * 使用移动平均算法，基于最近的 maxSamples 个数据点计算平均速度。
   * 
   * @param offset - 当前滚动偏移量
   * @returns 标准化的滚动速度（像素/毫秒）
   */
  const calculateSpeed = useCallback((offset: number): number => {
    const now = Date.now();
    const data = scrollDataRef.current;
    
    // 添加新样本
    data.positions.push({ offset, time: now });
    
    // 保持固定数量的样本（FIFO）
    if (data.positions.length > maxSamples) {
      data.positions.shift();
    }
    
    // 需要至少2个样本才能计算速度
    if (data.positions.length < 2) {
      return 0;
    }
    
    // 计算平均速度
    const first = data.positions[0];
    const last = data.positions[data.positions.length - 1];
    
    if (first === undefined || last === undefined) {
      return 0;
    }
    
    const distance = Math.abs(last.offset - first.offset);
    const time = last.time - first.time;
    
    // 避免除以零
    return time > 0 ? distance / time : 0;
  }, [maxSamples]);
  
  /**
   * 处理滚动事件
   * 
   * @param scrollOffset - 滚动偏移量
   */
  const handleScroll = useCallback((scrollOffset: number): void => {
    // 设置滚动状态
    if (!isScrolling) {
      setIsScrolling(true);
    }
    
    // 计算滚动速度
    const speed = calculateSpeed(scrollOffset);
    setScrollSpeed(speed);
    
    // 清除之前的定时器
    if (scrollDataRef.current.timer !== null) {
      clearTimeout(scrollDataRef.current.timer);
    }
    
    // 设置新的定时器，检测滚动停止
    scrollDataRef.current.timer = setTimeout(() => {
      setIsScrolling(false);
      setScrollSpeed(0);
      // 清空样本数据
      scrollDataRef.current.positions = [];
    }, scrollEndDelay);
  }, [isScrolling, calculateSpeed, scrollEndDelay]);
  
  /**
   * 检查是否为快速滚动
   */
  const isFastScrolling = scrollSpeed > fastScrollThreshold;
  
  /**
   * 重置滚动状态
   */
  const reset = useCallback(() => {
    setIsScrolling(false);
    setScrollSpeed(0);
    scrollDataRef.current.positions = [];
    
    if (scrollDataRef.current.timer !== null) {
      clearTimeout(scrollDataRef.current.timer);
      scrollDataRef.current.timer = null;
    }
  }, []);
  
  return {
    /** 是否正在滚动 */
    isScrolling,
    /** 当前滚动速度（像素/毫秒） */
    scrollSpeed,
    /** 是否为快速滚动 */
    isFastScrolling,
    /** 滚动事件处理函数 */
    handleScroll,
    /** 重置滚动状态 */
    reset
  };
}

/**
 * 使用RAF优化的滚动处理Hook
 * 
 * 结合 requestAnimationFrame 提供更流畅的滚动体验。
 * 适用于需要高性能渲染的场景。
 * 
 * @param options - 滚动配置选项
 * @returns 滚动状态和处理函数
 */
export function useRAFOptimizedScroll(options: ScrollSpeedOptions = {}): {
  isScrolling: boolean;
  scrollSpeed: number;
  isFastScrolling: boolean;
  handleScroll: (scrollOffset: number) => void;
  reset: () => void;
} {
  const scrollHook = useOptimizedScroll(options);
  const rafIdRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  
  /**
   * 使用RAF优化的滚动处理
   */
  const handleScrollRAF = useCallback((scrollOffset: number): void => {
    // 保存最新的滚动偏移
    pendingScrollRef.current = scrollOffset;
    
    // 如果已有待处理的RAF，直接返回
    if (rafIdRef.current !== null) {
      return;
    }
    
    // 请求下一帧执行
    rafIdRef.current = requestAnimationFrame(() => {
      if (pendingScrollRef.current !== null) {
        scrollHook.handleScroll(pendingScrollRef.current);
        pendingScrollRef.current = null;
      }
      rafIdRef.current = null;
    });
  }, [scrollHook]);
  
  /**
   * 清理RAF
   */
  const cleanup = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    scrollHook.reset();
  }, [scrollHook]);
  
  return {
    ...scrollHook,
    handleScroll: handleScrollRAF,
    reset: cleanup
  };
}
