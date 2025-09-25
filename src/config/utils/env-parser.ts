/**
 * 环境变量解析工具类
 */

// 环境变量解析工具
export class EnvParser {
  /**
   * 解析布尔值
   */
  static parseBoolean(value: string | undefined): boolean {
    return value === 'true';
  }

  /**
   * 解析字符串数组（逗号分隔）
   */
  static parseStringArray(value: string | undefined): string[] {
    if (!value) return [];
    return value.split(',').filter(Boolean).map(item => item.trim());
  }
  /**
   * 解析整数
   */
  static parseInteger(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  /**
   * 验证Token格式
   */
  static validateToken(token: any): token is string {
    return typeof token === 'string' &&
           token.trim().length > 0 &&
           token.trim() !== 'your_token_here' &&
           !token.includes('placeholder');
  }
}
