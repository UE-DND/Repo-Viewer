// 错误级别枚举
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 错误类别枚举
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  AUTH = 'auth',
  VALIDATION = 'validation',
  FILE_OPERATION = 'file_operation',
  COMPONENT = 'component',
  SYSTEM = 'system'
}

// 基础错误接口
export interface BaseError {
  code: string;
  message: string;
  level: ErrorLevel;
  category: ErrorCategory;
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

// API错误接口
export interface APIError extends BaseError {
  category: ErrorCategory.API;
  statusCode: number;
  endpoint: string;
  method: string;
  requestId?: string;
}

// 网络错误接口
export interface NetworkError extends BaseError {
  category: ErrorCategory.NETWORK;
  url: string;
  timeout?: boolean;
  retryCount?: number;
}

// GitHub API特定错误
export interface GitHubError extends APIError {
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  documentationUrl?: string;
}

// 文件操作错误
export interface FileOperationError extends BaseError {
  category: ErrorCategory.FILE_OPERATION;
  fileName: string;
  fileSize?: number;
  operation: 'read' | 'write' | 'download' | 'compress' | 'parse';
}

// 组件错误
export interface ComponentError extends BaseError {
  category: ErrorCategory.COMPONENT;
  componentName: string;
  props?: Record<string, any>;
  errorBoundary?: string;
}

// 认证错误
export interface AuthError extends BaseError {
  category: ErrorCategory.AUTH;
  tokenType?: 'github_pat' | 'session';
  tokenIndex?: number;
}

// 验证错误
export interface ValidationError extends BaseError {
  category: ErrorCategory.VALIDATION;
  field: string;
  value: any;
  expectedType?: string;
}

// 系统错误
export interface SystemError extends BaseError {
  category: ErrorCategory.SYSTEM;
  browserInfo?: string;
  platform?: string;
  memory?: number;
}

// 错误联合类型
export type AppError =
  | APIError
  | NetworkError
  | GitHubError
  | FileOperationError
  | ComponentError
  | AuthError
  | ValidationError
  | SystemError;

// 类型守卫函数
export function isAPIError(error: AppError): error is APIError {
  return error.category === ErrorCategory.API;
}

export function isNetworkError(error: AppError): error is NetworkError {
  return error.category === ErrorCategory.NETWORK;
}

export function isGitHubError(error: AppError): error is GitHubError {
  return error.category === ErrorCategory.API && 'rateLimitRemaining' in error;
}

export function isFileOperationError(error: AppError): error is FileOperationError {
  return error.category === ErrorCategory.FILE_OPERATION;
}

export function isComponentError(error: AppError): error is ComponentError {
  return error.category === ErrorCategory.COMPONENT;
}

export function isAuthError(error: AppError): error is AuthError {
  return error.category === ErrorCategory.AUTH;
}

export function isValidationError(error: AppError): error is ValidationError {
  return error.category === ErrorCategory.VALIDATION;
}

export function isSystemError(error: AppError): error is SystemError {
  return error.category === ErrorCategory.SYSTEM;
}

// 错误上下文接口
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp?: number;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// 错误处理配置
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableErrorReporting: boolean;
  maxErrorsPerSession: number;
  retryAttempts: number;
  retryDelay: number;
}

// 错误恢复策略
export interface ErrorRecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<void> | void;
  fallback?: () => React.ReactNode;
}
