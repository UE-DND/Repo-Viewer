import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface ContainerSize {
  width: number;
  height: number;
}

interface UseContainerSizeResult {
  containerRef: RefObject<HTMLDivElement | null>;
  containerSize: ContainerSize;
}

export const useContainerSize = (): UseContainerSizeResult => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }

    const updateSize = (): void => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry !== undefined) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return {
    containerRef,
    containerSize,
  };
};

