import { createLazyPreviewComponent } from '../core/createLazyPreviewComponent';
import type { MarkdownPreviewProps } from '../../../components/preview/markdown/types';
import type { ImagePreviewProps } from '../../../components/preview/image/types';
import { MarkdownPreviewSkeleton } from '../../../components/ui/skeletons';

/**
 * 懒加载Markdown预览组件
 */
export const LazyMarkdownPreview = createLazyPreviewComponent<MarkdownPreviewProps>(
  () => import('../../../components/preview/markdown'),
  {
    fallback: ({ isSmallScreen }) => (
      <MarkdownPreviewSkeleton isSmallScreen={isSmallScreen} />
    ),
  }
);

/**
 * 懒加载图片预览组件
 */
export const LazyImagePreview = createLazyPreviewComponent<ImagePreviewProps>(
  () => import('../../../components/preview/image')
);
