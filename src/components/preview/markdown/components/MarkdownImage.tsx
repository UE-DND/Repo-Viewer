import React, { useState } from "react";
import { GitHubContent } from "../../../../types";
import {
  transformImageSrc,
  handleImageError,
  handleImageLoad,
  ImageLoadingState,
  tryDirectImageLoad,
} from "../utils/imageUtils";
import { ImageErrorDisplay } from "./ImageErrorDisplay";

interface MarkdownImageProps {
  src?: string | undefined;
  alt?: string | undefined;
  style?: React.CSSProperties | undefined;
  previewingItem: GitHubContent | null;
  imageState: ImageLoadingState;
  [key: string]: any;
}

export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src,
  alt,
  style,
  previewingItem,
  imageState,
  ...rest
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageFailed, setIsImageFailed] = useState(
    imageState.failedImages.has(src || "")
  );

  const { imgSrc, originalSrc } = transformImageSrc(src, previewingItem);
  const imgId = `img-${imgSrc.replace(/[^a-zA-Z0-9]/g, "-")}`;

  const handleRetry = () => {
    // 重置失败状态
    setIsImageFailed(false);
    // 从失败缓存中移除
    imageState.failedImages.delete(imgSrc || "");

    // 尝试使用备选加载方式
    const directSrc = tryDirectImageLoad(imgSrc);
    if (directSrc) {
      // 使用直接URL加载
      const imgElement = document.getElementById(imgId)?.querySelector("img");
      if (imgElement) {
        imgElement.src = directSrc;
      }
    } else {
      // 强制重新渲染以触发图片重新加载
      window.location.reload();
    }
  };

  if (isImageFailed) {
    return <ImageErrorDisplay imgSrc={imgSrc} onRetry={handleRetry} />;
  }

  return (
    <img
      src={imgSrc}
      id={imgId}
      style={{
        maxWidth: "100%",
        height: "auto",
        opacity: isImageLoaded ? 1 : 0.7,
        transition: "opacity 0.3s ease",
        display: "block",
        margin: "1em auto",
        ...style
      }}
      alt={alt || "图片"}
      {...rest}
      loading="lazy"
      className={isImageLoaded ? "loaded" : isImageFailed ? "failed" : ""}
      onLoad={(e) => {
        // 添加loaded类以触发淡入效果
        e.currentTarget.classList.add("loaded");
        e.currentTarget.style.opacity = "1";
        
        handleImageLoad(imgSrc, imageState, setIsImageLoaded);
      }}
      onError={(e) => {
        const newSrc = handleImageError(
          imgSrc,
          originalSrc,
          imageState,
          setIsImageFailed
        );
        
        if (newSrc && newSrc !== imgSrc) {
          e.currentTarget.src = newSrc;
        }
      }}
      data-oid="1jtw89v"
    />
  );
};