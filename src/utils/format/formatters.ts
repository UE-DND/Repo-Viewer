// 格式化日期
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (_e) {
    return dateString;
  }
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // 确保索引在有效范围内
  const sizeUnit = sizes[i] ?? 'Bytes';
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  return `${String(formattedSize)} ${sizeUnit}`;
}; 