import { useEffect } from "react";
import { useSEO } from "../../contexts/SEOContext";
import SEO from "./SEO";

interface DynamicSEOProps {
  title?: string;
  description?: string;
  filePath?: string;
  fileType?: string;
  isDirectory?: boolean;
  repoOwner?: string;
  repoName?: string;
}

/**
 * 动态SEO组件 - 根据当前查看的文件或目录动态更新SEO信息
 */
const DynamicSEO: React.FC<DynamicSEOProps> = ({
  title,
  description,
  filePath,
  fileType,
  isDirectory = false,
  repoOwner,
  repoName,
}) => {
  const { updateSEO, resetSEO } = useSEO();

  useEffect(() => {
    // 如果没有足够的信息，则使用默认SEO设置
    if (!filePath && !title) {
      resetSEO();
      return;
    }

    // 构建SEO标题
    let seoTitle = title || "";
    if (filePath && !seoTitle) {
      const fileNameMatch = filePath.match(/([^/]+)$/);
      seoTitle = fileNameMatch?.[1] || filePath;
    }

    // 添加"Repoviewer"到标题中，不再显示仓库信息
    seoTitle = `${seoTitle} | Repo-Viewer`;

    // 构建SEO描述
    let seoDescription = description || "";
    if (!seoDescription) {
      if (isDirectory) {
        seoDescription = `查看 ${filePath || "仓库"} 目录中的内容`;
      } else {
        seoDescription = `查看 ${filePath || "文件"} 的详细内容`;
        if (fileType) {
          seoDescription += `（${fileType}格式）`;
        }
      }

      if (repoOwner && repoName) {
        seoDescription += ` - ${repoOwner}/${repoName} GitHub仓库`;
      }
    }

    // 更新SEO数据
    updateSEO({
      title: seoTitle,
      description: seoDescription,
    });

    // 组件卸载时重置SEO数据
    return () => {
      resetSEO();
    };
  }, [
    filePath,
    title,
    description,
    fileType,
    isDirectory,
    repoOwner,
    repoName,
    updateSEO,
    resetSEO,
  ]);

  return <SEO data-oid="yjh--07" />;
};

export default DynamicSEO;
