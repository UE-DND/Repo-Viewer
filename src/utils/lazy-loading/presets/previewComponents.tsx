import { createLazyPreviewComponent } from '../core/createLazyPreviewComponent';
import type { MarkdownPreviewProps } from '../../../components/preview/markdown/types';
import type { ImagePreviewProps } from '../../../components/preview/image/types';
import type { OfficePreviewProps } from '../../../components/preview/office/types';
import { MarkdownPreviewSkeleton } from '../../../components/ui/skeletons';

/**
 * 懒加载Markdown预览组件
 */
export const LazyMarkdownPreview = createLazyPreviewComponent<MarkdownPreviewProps>(
  () => import('../../../components/preview/markdown'),
  {
    fallback: (props) => (
      <MarkdownPreviewSkeleton
        isSmallScreen={Boolean(props?.isSmallScreen)}
      />
    ),
  }
);

/**
 * 懒加载图片预览组件
 */
export const LazyImagePreview = createLazyPreviewComponent<ImagePreviewProps>(
  () => import('../../../components/preview/image')
);

/**
 * 懒加载Office预览组件
 */
export const LazyOfficePreview = createLazyPreviewComponent<OfficePreviewProps>(
  () => import('../../../components/preview/office').then(module => ({ default: module.OfficePreview }))
);
