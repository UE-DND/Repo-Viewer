// 获取处理过的URL，解决CORS问题
export const getProxiedUrl = (url: string): string => {
  const isDevEnvironment = window.location.hostname === 'localhost';
  const IMAGE_PROXY_URL = (import.meta.env.IMAGE_PROXY_URL || import.meta.env.VITE_IMAGE_PROXY_URL || 'https://gh-proxy.com');

  if (!isDevEnvironment) {
    // 生产环境使用gh-proxy代理
    if (url.includes('raw.githubusercontent.com')) {
      return `${IMAGE_PROXY_URL}/${url}`;
    } else if (url.includes('api.github.com')) {
      return `${IMAGE_PROXY_URL}/${url}`;
    }
    return url;
  }
  
  // 开发环境下转换URL
  if (url.includes('raw.githubusercontent.com')) {
    // 替换为本地代理URL
    return url.replace('https://raw.githubusercontent.com', '/github-raw');
  } else if (url.includes('api.github.com')) {
    // 替换为本地API代理
    return url.replace('https://api.github.com', '/github-api');
  }
  
  return url;
}; 