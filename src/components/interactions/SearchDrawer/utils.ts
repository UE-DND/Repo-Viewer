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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 高亮文本中的多个关键字
 */
export const highlightKeywords = (
  text: string,
  keyword: string
): { text: string; highlight: boolean }[] => {
  const tokens = keyword
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return [{ text, highlight: false }];
  }

  const uniqueTokens = Array.from(new Set(tokens))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  const pattern = uniqueTokens.join("|");
  if (pattern.length === 0) {
    return [{ text, highlight: false }];
  }

  const regex = new RegExp(`(${pattern})`, "gi");
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let match = regex.exec(text);

  while (match !== null) {
    const index = match.index;
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), highlight: false });
    }
    const matchedText = match[0];
    parts.push({ text: matchedText, highlight: true });
    lastIndex = index + matchedText.length;
    match = regex.exec(text);
  }

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
