/**
 * SEO上下文模块导出
 *
 * 重新导出MetadataProvider作为SEO上下文的默认实现，
 * 用于统一管理页面SEO元数据（标题、描述、关键词等）。
 */

export { MetadataProvider as default } from "@/contexts/MetadataContext";
