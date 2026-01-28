import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/utils";

const COPY_RESET_DELAY = 2000;

interface UseCopyToClipboardOptions {
  resetDelay?: number;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = COPY_RESET_DELAY, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopied(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (typeof navigator === "undefined") {
          const error = new Error("navigator 未定义");
          logger.error("复制失败:", error);
          onError?.(error);
          return false;
        }

        const clipboard = navigator.clipboard as Clipboard | undefined;

        if (clipboard === undefined || typeof clipboard.writeText !== "function") {
          logger.warn("当前环境不支持 Clipboard API 自动复制");
          return false;
        }

        await clipboard.writeText(text);

        setCopied(true);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, resetDelay);

        onSuccess?.();
        return true;
      } catch (error) {
        logger.error("复制失败:", error);
        onError?.(error);
        return false;
      }
    },
    [resetDelay, onSuccess, onError]
  );

  return { copied, copy, reset };
}
