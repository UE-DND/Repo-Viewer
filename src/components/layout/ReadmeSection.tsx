import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyMarkdownPreview } from '@/utils/lazy-loading';
import { MarkdownPreviewSkeleton } from '@/components/ui/skeletons';
import type { GitHubContent } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useContentContext, usePreviewContext } from '@/contexts/unified';
import { scroll, logger } from '@/utils';

interface ReadmeSectionProps {
  hasReadmeFile: boolean;
  readmeContent: string | null;
  loadingReadme: boolean;
  readmeLoaded: boolean;
  isSmallScreen: boolean;
  currentBranch: string;
  readmeFileItem: GitHubContent | null;
  isTransitioning?: boolean;
}

/**
 * README 预览区域组件
 *
 * 显示当前目录的 README 文件预览
 */
const ReadmeSection: React.FC<ReadmeSectionProps> = ({
  hasReadmeFile,
  readmeContent,
  loadingReadme,
  readmeLoaded,
  isSmallScreen,
  currentBranch,
  readmeFileItem,
  isTransitioning = false
}) => {
  const { t } = useI18n();
  const { navigateTo, findFileItemByPath, currentPath } = useContentContext();
  const { selectFile } = usePreviewContext();

  // 提取路径值，避免 useMemo 依赖项问题
  const readmeFilePath = readmeFileItem?.path;

  // 获取当前 README 文件所在的目录路径
  const currentReadmeDir = React.useMemo(() => {
    if (readmeFilePath !== undefined && readmeFilePath.length > 0) {
      const lastSlashIndex = readmeFilePath.lastIndexOf('/');
      return lastSlashIndex >= 0 ? readmeFilePath.substring(0, lastSlashIndex) : '';
    }
    return currentPath;
  }, [readmeFilePath, currentPath]);

  // 处理内部链接点击
  const handleInternalLinkClick = useCallback(
    (relativePath: string) => {
      // 解析相对路径
      let targetPath = relativePath;

      // 移除开头的 ./
      if (targetPath.startsWith('./')) {
        targetPath = targetPath.substring(2);
      }

      // 处理 ../ 路径
      const baseParts = currentReadmeDir.length > 0 ? currentReadmeDir.split('/') : [];
      const targetParts = targetPath.split('/');

      const resolvedParts = [...baseParts];
      for (const part of targetParts) {
        if (part === '..') {
          resolvedParts.pop();
        } else if (part !== '.' && part !== '') {
          resolvedParts.push(part);
        }
      }

      const resolvedPath = resolvedParts.join('/');
      logger.debug(`内部链接导航: ${relativePath} -> ${resolvedPath}`);

      // 尝试找到对应的文件项
      const fileItem = findFileItemByPath(resolvedPath);

      if (fileItem !== undefined) {
        // 如果找到了文件项，根据类型进行处理
        if (fileItem.type === 'dir') {
          navigateTo(resolvedPath, 'forward');
        } else {
          // 文件类型，打开预览
          void selectFile(fileItem);
        }
      } else {
        // 如果在当前目录内容中找不到，尝试直接导航
        // 判断是否可能是目录（没有扩展名或特定的目录标识）
        const hasExtension = /\.[^/]+$/.test(resolvedPath);
        if (!hasExtension) {
          // 可能是目录，尝试导航
          navigateTo(resolvedPath, 'forward');
        } else {
          // 可能是其他目录中的文件，导航到其父目录
          const lastSlashIdx = resolvedPath.lastIndexOf('/');
          const parentPath = lastSlashIdx >= 0 ? resolvedPath.substring(0, lastSlashIdx) : '';
          navigateTo(parentPath, 'forward');
          logger.info(`文件不在当前目录，导航到父目录: ${parentPath}`);
        }
      }

      // 导航后滚动到页面顶部
      void scroll.scrollToTop();
    },
    [currentReadmeDir, findFileItemByPath, navigateTo, selectFile]
  );

  if (!hasReadmeFile) {
    return null;
  }

  const hasReadmeContent = typeof readmeContent === "string" && readmeContent.trim().length > 0;
  const shouldShowReadmeSkeleton = !hasReadmeContent && (!readmeLoaded || loadingReadme);

  return (
    <AnimatePresence mode="wait">
      {!isTransitioning && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 0.96,
            transition: {
              duration: 0.125,
              ease: [0.4, 0, 0.2, 1]
            }
          }}
          style={{ width: '100%' }}
        >
          <Box
            className="readme-container"
            sx={{
              position: "relative",
              width: "100%",
              mb: 4,
              display: "flex",
              flexDirection: "column",
            }}
            data-oid="0zc9q5:"
          >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: "flex",
          alignItems: "center",
          color: "text.primary",
        }}
        data-oid="iawc_6m"
      />

      {shouldShowReadmeSkeleton ? (
        <MarkdownPreviewSkeleton
          isSmallScreen={isSmallScreen}
          data-oid="readme-skeleton"
        />
      ) : hasReadmeContent ? (
        <LazyMarkdownPreview
          readmeContent={readmeContent}
          loadingReadme={false}
          isSmallScreen={isSmallScreen}
          lazyLoad={false}
          currentBranch={currentBranch}
          previewingItem={readmeFileItem}
          onInternalLinkClick={handleInternalLinkClick}
          data-oid="6nohd:r"
        />
      ) : readmeLoaded ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
          data-oid="readme-empty"
        >
          {t('ui.readme.empty')}
        </Typography>
      ) : null}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReadmeSection;
