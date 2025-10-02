import { createLazyPreviewComponent } from '../core/createLazyPreviewComponent';
import type { MarkdownPreviewProps } from '../../../components/preview/markdown/types';
import type { ImagePreviewProps } from '../../../components/preview/image/types';
import type { OfficePreviewProps } from '../../../components/preview/office/types';

export const LazyMarkdownPreview = createLazyPreviewComponent<MarkdownPreviewProps>(
  () => import('../../../components/preview/markdown')
);

export const LazyImagePreview = createLazyPreviewComponent<ImagePreviewProps>(
  () => import('../../../components/preview/image')
);

export const LazyOfficePreview = createLazyPreviewComponent<OfficePreviewProps>(
  () => import('../../../components/preview/office').then(module => ({ default: module.OfficePreview }))
);
