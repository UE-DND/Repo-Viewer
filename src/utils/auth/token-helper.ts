import { GitHubService } from '../../services/github';
import { logger } from '../logging/logger';
import axios from 'axios';

/**
 * 从服务器获取GitHub Token状态
 * 使用新添加的API接口
 */
export async function fetchServerTokenStatus() {
  try {
    // 调用新添加的服务端API接口
    const response = await axios.get('/api/github?action=getTokenStatus');

    if (response.data && response.data.status === 'success') {
      const { hasTokens, count } = response.data.data;
      return { 
        hasToken: hasTokens, 
        tokenCount: count,
        isServerToken: true
      };
    }

    return { hasToken: false, tokenCount: 0, isServerToken: true };
  } catch (error) {
    logger.error('获取服务器令牌状态失败:', error);
    return { hasToken: false, tokenCount: 0, isServerToken: true, error };
  }
}

/**
 * 检查GitHub Token状态
 * 在控制台输出token相关信息
 */
export async function checkTokenStatus() {
  // 获取前端token状态
  const clientTokenCount = GitHubService.getTokenCount();
  const hasClientToken = GitHubService.hasToken();

  // 获取服务端token状态
  let serverTokenStatus = { hasToken: false, tokenCount: 0 };

  try {
    // 检查是否为生产环境
    const isProduction = !import.meta.env.DEV;

    if (isProduction) {
      // 在生产环境中，获取服务端token状态
      serverTokenStatus = await fetchServerTokenStatus();
    }
  } catch (error) {
    logger.error('检查服务端令牌状态失败:', error);
  }

  // 结合前端和后端状态
  const hasToken = hasClientToken || serverTokenStatus.hasToken;
  const tokenCount = serverTokenStatus.hasToken ? 
    serverTokenStatus.tokenCount : clientTokenCount;

  // 记录状态
  logger.info(`=============================================`);
  logger.info(`GitHub Token状态: ${hasToken ? '已配置 ✅' : '未配置 ❌'}`);
  logger.info(`Token数量: ${tokenCount}`);

  if (serverTokenStatus.hasToken) {
    logger.info(`令牌位置: 服务器端`);
  } else if (hasClientToken) {
    logger.info(`令牌位置: 客户端 (开发环境)`);
  }

  // 如果未配置token，给出提示
  if (!hasToken) {
    logger.warn('未检测到GitHub Token，API搜索功能可能受限。');
    logger.warn('请考虑配置Token以获取更好的搜索体验。');
    logger.info('您可以使用以下代码在开发环境中设置临时token:');
    logger.info('GitHubService.setLocalToken("your_github_token_here")');
  }
  logger.info(`=============================================`);

  return { 
    hasToken, 
    tokenCount,
    clientToken: { hasToken: hasClientToken, count: clientTokenCount },
    serverToken: serverTokenStatus
  };
}

/**
 * 测试GitHub API搜索功能
 * 用于测试配置的token是否有效
 */
export async function testApiSearch() {
  try {
    logger.info('正在测试GitHub API搜索...');
    const result = await GitHubService.searchFiles('test', '', true);
    logger.info(`搜索成功! 找到 ${result.length} 个结果`);
    logger.debug('搜索结果:', result);
    return true;
  } catch (error) {
    logger.error('GitHub API搜索测试失败:', error);
    return false;
  }
}

// 导出便捷函数，方便在控制台使用
(window as any).checkGitHubToken = checkTokenStatus;
(window as any).testGitHubSearch = testApiSearch;
