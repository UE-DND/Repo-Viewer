import React, { useMemo } from 'react';
import { List, useTheme } from '@mui/material';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import FileListItem from './FileListItem';
import { GitHubContent } from '../../types';

interface FileListProps {
  contents: GitHubContent[];
  isSmallScreen: boolean;
  downloadingPath: string | null;
  downloadingFolderPath: string | null;
  folderDownloadProgress: number;
  handleItemClick: (item: GitHubContent) => void;
  handleDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleFolderDownloadClick: (e: React.MouseEvent, item: GitHubContent) => void;
  handleCancelDownload: (e: React.MouseEvent) => void;
  currentPath: string;
}

// 列表项渲染器
const Row = React.memo(({ data, index, style }: ListChildComponentProps) => {
  const {
    contents,
    isSmallScreen,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath
  } = data;
  
  const item = contents[index];
  
  return (
    <div style={style}>
      <FileListItem 
        key={item.path}
        item={item}
        isSmallScreen={isSmallScreen}
        downloadingPath={downloadingPath}
        downloadingFolderPath={downloadingFolderPath}
        folderDownloadProgress={folderDownloadProgress}
        handleItemClick={handleItemClick}
        handleDownloadClick={handleDownloadClick}
        handleFolderDownloadClick={handleFolderDownloadClick}
        handleCancelDownload={handleCancelDownload}
        currentPath={currentPath}
      />
    </div>
  );
});

Row.displayName = 'FileListRow';

// 优化的文件列表组件
const FileList = React.memo<FileListProps>(({
  contents,
  isSmallScreen,
  downloadingPath,
  downloadingFolderPath,
  folderDownloadProgress,
  handleItemClick,
  handleDownloadClick,
  handleFolderDownloadClick,
  handleCancelDownload,
  currentPath
}) => {
  const theme = useTheme();
  
  // 仅当相关数据变化时才更新列表项数据
  const itemData = useMemo(() => ({
    contents,
    isSmallScreen,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath
  }), [
    contents,
    isSmallScreen,
    downloadingPath,
    downloadingFolderPath,
    folderDownloadProgress,
    handleItemClick,
    handleDownloadClick,
    handleFolderDownloadClick,
    handleCancelDownload,
    currentPath
  ]);
  
  // 优化：如果文件数量少于50个，不使用虚拟化列表
  if (contents.length < 50) {
    return (
      <List 
        sx={{ 
          width: '100%', 
          bgcolor: 'background.paper', 
          borderRadius: 2,
          mb: 2,
          overflow: 'hidden',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 1, sm: 2 }
        }}
      >
        {contents.map((item) => (
          <FileListItem 
            key={item.path}
            item={item}
            isSmallScreen={isSmallScreen}
            downloadingPath={downloadingPath}
            downloadingFolderPath={downloadingFolderPath}
            folderDownloadProgress={folderDownloadProgress}
            handleItemClick={handleItemClick}
            handleDownloadClick={handleDownloadClick}
            handleFolderDownloadClick={handleFolderDownloadClick}
            handleCancelDownload={handleCancelDownload}
            currentPath={currentPath}
          />
        ))}
      </List>
    );
  }
  
  // 大量文件时使用虚拟化列表
  const rowHeight = isSmallScreen ? 60 : 72;
  // 计算列表的动态高度，但设置最大高度以避免太长
  const listHeight = Math.min(contents.length * rowHeight, 500);
  
  return (
    <List 
      sx={{ 
        width: '100%',
        height: 'auto',
        maxHeight: listHeight,
        bgcolor: 'background.paper', 
        borderRadius: 2,
        mb: 2,
        overflow: 'hidden', // 改回hidden以防止内容溢出
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 1, sm: 2 }
      }}
    >
      <div style={{ height: listHeight, overflow: 'hidden' }}>
        <AutoSizer disableHeight>
          {({ width }: { width: number }) => (
            <FixedSizeList
              height={listHeight}
              width={width}
              itemCount={contents.length}
              itemSize={rowHeight}
              itemData={itemData}
              style={{ overflowX: 'hidden', overflowY: 'auto' }} // 允许垂直滚动，但禁用水平滚动
            >
              {Row}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    </List>
  );
});

FileList.displayName = 'FileList';

export default FileList; 