import { z } from 'zod';

// GitHub内容项链接结构
export const GitHubLinksSchema = z.object({
  self: z.string(),
  git: z.string(),
  html: z.string(),
});

// GitHub内容项基础结构
export const GitHubContentItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().optional(),
  url: z.string(),
  html_url: z.string(),
  git_url: z.string(),
  download_url: z.string().nullable(),
  type: z.enum(['file', 'dir']),
  _links: GitHubLinksSchema.optional(),
});

// GitHub获取内容API响应（可能是单个文件或目录内容数组）
export const GitHubContentsResponseSchema = z.union([
  GitHubContentItemSchema,
  z.array(GitHubContentItemSchema),
]);

// GitHub搜索结果中的代码项
export const GitHubSearchCodeItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  url: z.string(),
  git_url: z.string(),
  html_url: z.string(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
      id: z.number(),
      avatar_url: z.string(),
      html_url: z.string(),
    }),
    html_url: z.string(),
    description: z.string().nullable(),
    private: z.boolean(),
  }),
  score: z.number(),
  file_size: z.number().optional(),
  language: z.string().nullable().optional(),
  last_modified_at: z.string().optional(),
});

// GitHub搜索API响应结构
export const GitHubSearchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(GitHubSearchCodeItemSchema),
});

// 导出所有Schema的类型
export type GitHubContentItem = z.infer<typeof GitHubContentItemSchema>;
export type GitHubContentsResponse = z.infer<typeof GitHubContentsResponseSchema>;
export type GitHubSearchCodeItem = z.infer<typeof GitHubSearchCodeItemSchema>;
export type GitHubSearchResponse = z.infer<typeof GitHubSearchResponseSchema>;

/**
 * 验证GitHub内容响应
 * 
 * @param data - 待验证的数据
 * @returns 验证后的GitHubContentsResponse
 * @throws 当数据格式不符合schema时抛出错误
 */
export function validateGitHubContentsResponse(data: unknown): GitHubContentsResponse {
  return GitHubContentsResponseSchema.parse(data);
}

/**
 * 验证GitHub搜索响应
 * 
 * @param data - 待验证的数据
 * @returns 验证后的GitHubSearchResponse
 * @throws 当数据格式不符合schema时抛出错误
 */
export function validateGitHubSearchResponse(data: unknown): GitHubSearchResponse {
  return GitHubSearchResponseSchema.parse(data);
}

/**
 * 安全验证GitHub内容响应
 * 
 * 不抛出异常的验证函数，返回包含成功状态的对象。
 * 
 * @param data - 待验证的数据
 * @returns 验证结果对象（成功或失败）
 */
export function safeValidateGitHubContentsResponse(data: unknown): {
  success: true;
  data: GitHubContentsResponse;
} | {
  success: false;
  error: string;
} {
  try {
    const validatedData = GitHubContentsResponseSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知验证错误' 
    };
  }
}

/**
 * 安全验证GitHub搜索响应
 * 
 * 不抛出异常的验证函数，返回包含成功状态的对象。
 * 
 * @param data - 待验证的数据
 * @returns 验证结果对象（成功或失败）
 */
export function safeValidateGitHubSearchResponse(data: unknown): {
  success: true;
  data: GitHubSearchResponse;
} | {
  success: false;
  error: string;
} {
  try {
    const validatedData = GitHubSearchResponseSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知验证错误' 
    };
  }
}
