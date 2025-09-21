import { createLazyPreviewComponent } from '../core/createLazyPreviewComponent';

/**
 * 预定义的懒加载预览组件
 * 这些是项目中最常用的预览组件的懒加载版本
 */
export const LazyMarkdownPreview = createLazyPreviewComponent(
  () => import('../../../components/preview/markdown')
);

export const LazyImagePreview = createLazyPreviewComponent(
  () => import('../../../components/preview/image')
);

export const LazyOfficePreview = createLazyPreviewComponent(
  () => import('../../../components/preview/office').then(module => ({ default: module.OfficePreview }))
);

// 可以根据需要添加更多预定义组件
// export const LazyPDFPreview = createLazyPreviewComponent(
//   () => import('../../preview/pdf'),
//   { loadingText: '正在加载 PDF 预览...' }
// );
