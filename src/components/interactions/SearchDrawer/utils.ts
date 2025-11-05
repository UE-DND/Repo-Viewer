/**
 * 工具函数：格式化和解析扩展名输入
 */

export const formatExtensionInput = (extensions: string[]): string => 
  extensions.join(", ");

export const parseExtensionInput = (value: string): string[] => {
  if (value.trim().length === 0) {
    return [];
  }

  const segments = value
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/^\./, "").toLowerCase())
    .filter((item) => item.length > 0);

  return Array.from(new Set(segments));
};

/**
 * 高亮文本中的关键字
 */
export const highlightKeyword = (
  text: string, 
  keyword: string
): { text: string; highlight: boolean }[] => {
  if (keyword.trim().length === 0) {
    return [{ text, highlight: false }];
  }
  
  const parts: { text: string; highlight: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerKeyword);

  while (index !== -1) {
    // 添加关键字前的文本
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), highlight: false });
    }

    // 添加关键字（高亮）
    parts.push({ text: text.slice(index, index + lowerKeyword.length), highlight: true });

    lastIndex = index + lowerKeyword.length;
    index = lowerText.indexOf(lowerKeyword, lastIndex);
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts;
};

/**
 * 解析搜索结果项的 GitHub URL
 */
export const resolveItemHtmlUrl = (item: { htmlUrl?: string; html_url?: string }): string | undefined => {
  if (typeof item.htmlUrl === "string") {
    return item.htmlUrl;
  }
  if (typeof item.html_url === "string") {
    return item.html_url;
  }
  return undefined;
};

