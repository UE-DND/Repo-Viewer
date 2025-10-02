import { GitHubService } from "@/services/github/core/GitHubService";
import type { GitHubContent } from "@/types";
import { logger } from "@/utils";

const GITHUB_USER_CONTENT_PATH_REGEX =
  /githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)/;

const PROXY_FAILURE_HOSTS = [
  "gh-proxy.com",
  "ghproxy.com",
  "staticdn.net",
  "ghfast.top",
];

const extractGithubusercontentPath = (url: string): string | null => {
  const match = GITHUB_USER_CONTENT_PATH_REGEX.exec(url);
  return match?.[1] ?? null;
};

const getOriginFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    logger.debug("解析URL来源失败", { url, error });
    return null;
  }
};

export interface ImageLoadingState {
  loadedImages: Set<string>;
  failedImages: Set<string>;
  imageTimers: Map<string, number>;
}

export const createImageLoadingState = (): ImageLoadingState => ({
  loadedImages: new Set<string>(),
  failedImages: new Set<string>(),
  imageTimers: new Map<string, number>(),
});

/**
 * 尝试不同的图片加载方式
 */
export const tryDirectImageLoad = (imgSrc: string): string | null => {
  if (imgSrc.trim().length === 0) {
    return null;
  }

  if (!imgSrc.includes("githubusercontent.com")) {
    return null;
  }

  try {
    let directPath: string | null = null;
    if (imgSrc.includes("/api/github?action=getFileContent&url=")) {
      const encodedUrl = imgSrc.split("url=")[1];
      if (typeof encodedUrl === "string" && encodedUrl.length > 0) {
        const decodedUrl = decodeURIComponent(encodedUrl);
        directPath = extractGithubusercontentPath(decodedUrl);
      }
    } else {
      directPath = extractGithubusercontentPath(imgSrc);
    }

    if (directPath === null || directPath.length === 0) {
      return null;
    }

    const proxy = "https://cdn.jsdelivr.net/gh";
    const currentProxy = GitHubService.getCurrentProxyService();
    const repoOwner = currentProxy.includes("Royfor12") ? "Royfor12" : "UE-DND";
    const repoName = currentProxy.includes("CQUT-Course-Guide-Sharing-Scheme")
      ? "CQUT-Course-Guide-Sharing-Scheme"
      : "Repo-Viewer";
    const newSrc = `${proxy}/${repoOwner}/${repoName}@main/${directPath}`;
    logger.info("尝试使用JSDelivr加载图片:", newSrc);
    return newSrc;
  } catch (error) {
    logger.error("解析直接URL失败:", error);
    return null;
  }
};

/**
 * 处理图片路径转换
 */
export const transformImageSrc = (
  src: string | undefined,
  previewingItem: GitHubContent | null
): { imgSrc: string; originalSrc: string } => {
  const originalSrc = src ?? "";
  let imgSrc = originalSrc;

  if (
    previewingItem !== null &&
    typeof src === "string" &&
    src.length > 0
  ) {
    // 记录转换前的URL
    logger.debug("Markdown中的原始图片URL:", src);
    logger.debug("当前Markdown文件路径:", previewingItem.path);

    // 使用GitHubService处理图片URL
    const transformedSrc = GitHubService.transformImageUrl(
      src,
      previewingItem.path,
      true
    );

    if (typeof transformedSrc === "string" && transformedSrc.length > 0) {
      logger.debug("转换后的图片URL:", transformedSrc);
      imgSrc = transformedSrc;
    } else {
      logger.warn("URL转换失败，使用原始URL:", src);
    }
  }

  return { imgSrc, originalSrc };
};

/**
 * 处理图片加载错误
 */
export const handleImageError = (
  imgSrc: string,
  originalSrc: string,
  imageState: ImageLoadingState,
  setIsImageFailed: (failed: boolean) => void
): string | null => {
  logger.error("图片加载失败:", imgSrc);

  // 清除超时计时器
  const timerId = imageState.imageTimers.get(imgSrc);
  if (typeof timerId === "number") {
    window.clearTimeout(timerId);
    imageState.imageTimers.delete(imgSrc);
  }

  // 如果是代理URL，尝试标记该代理服务失败
  if (imgSrc.length > 0 && PROXY_FAILURE_HOSTS.some((host) => imgSrc.includes(host))) {
    try {
      // 提取代理服务URL
      const proxyUrl = getOriginFromUrl(imgSrc);
      // 标记该代理服务失败
      if (typeof proxyUrl === "string" && proxyUrl.length > 0) {
        GitHubService.markProxyServiceFailed(proxyUrl);
        logger.warn("标记代理服务失败:", proxyUrl);
      }

      // 获取新的代理服务
      const currentProxy = GitHubService.getCurrentProxyService();
      logger.info("切换到新的代理服务:", currentProxy);

      // 如果还有可用的备选代理，重新加载图片
      if (
        currentProxy.length > 0 &&
        typeof proxyUrl === "string" &&
        proxyUrl.length > 0 &&
        currentProxy !== proxyUrl
      ) {
        // 清除失败记录以允许重试
        imageState.failedImages.delete(imgSrc);
        // 重置失败状态
        setIsImageFailed(false);
        return null;
      }
    } catch (error) {
      logger.error("处理代理服务失败出错:", error);
    }
  }

  // 尝试使用备选的直接加载方式
  const directSrc = tryDirectImageLoad(imgSrc);
  if (typeof directSrc === "string" && directSrc.length > 0) {
    logger.info("尝试使用直接URL加载:", directSrc);
    // 设置新的超时计时器
    const newTimerId = window.setTimeout(() => {
      if (!imageState.loadedImages.has(directSrc)) {
        imageState.failedImages.add(imgSrc);
        setIsImageFailed(true);
      }
    }, 15000); // 15秒超时

    imageState.imageTimers.set(directSrc, newTimerId);
    return directSrc;
  }

  // 如果转换后的URL加载失败，可以尝试使用原始URL
  if (
    imgSrc !== originalSrc &&
    originalSrc.length > 0 &&
    !imageState.failedImages.has(originalSrc)
  ) {
    logger.debug("尝试使用原始URL:", originalSrc);
    // 为原始URL设置超时计时器
    const newTimerId = window.setTimeout(() => {
      if (!imageState.loadedImages.has(originalSrc)) {
        imageState.failedImages.add(originalSrc);
        setIsImageFailed(true);
      }
    }, 15000); // 15秒超时

    imageState.imageTimers.set(originalSrc, newTimerId);
    return originalSrc;
  } else {
    // 记录失败的图片
    if (imgSrc.length > 0) {
      imageState.failedImages.add(imgSrc);
      setIsImageFailed(true);
    }
  }

  return null;
};

/**
 * 处理图片加载成功
 */
export const handleImageLoad = (
  imgSrc: string,
  imageState: ImageLoadingState,
  setIsImageLoaded: (loaded: boolean) => void
): void => {
  // 设置本地状态
  setIsImageLoaded(true);

  logger.debug("图片加载成功:", imgSrc);

  // 记录已加载的图片，以便主题切换时不再重复加载效果
  if (typeof imgSrc === "string" && imgSrc.length > 0) {
    imageState.loadedImages.add(imgSrc);
    imageState.failedImages.delete(imgSrc);

    // 清除超时计时器
    const timerId = imageState.imageTimers.get(imgSrc);
    if (typeof timerId === "number") {
      window.clearTimeout(timerId);
      imageState.imageTimers.delete(imgSrc);
    }
  }
};