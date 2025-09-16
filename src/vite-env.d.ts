/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_TITLE?: string
  readonly VITE_GITHUB_REPO_OWNER?: string
  readonly VITE_GITHUB_REPO_NAME?: string
  readonly VITE_GITHUB_REPO_BRANCH?: string
  readonly VITE_IMAGE_PROXY_URL?: string
  readonly VITE_HOMEPAGE_FILTER_ENABLED?: string
  readonly VITE_HOMEPAGE_ALLOWED_FOLDERS?: string
  readonly VITE_HOMEPAGE_ALLOWED_FILETYPES?: string
  readonly VITE_USE_TOKEN_MODE?: string
  readonly VITE_DEVELOPER_MODE?: string
  readonly VITE_HIDE_MAIN_FOLDER_DOWNLOAD?: string
  readonly VITE_HIDE_DOWNLOAD_FOLDERS?: string
  readonly VITE_DEBUG_MODE?: string
  readonly VITE_CONSOLE_LOGGING?: string
  // SEO相关环境变量
  readonly VITE_SITE_DESCRIPTION?: string
  readonly VITE_SITE_KEYWORDS?: string
  readonly VITE_SITE_OG_IMAGE?: string
  // GITHUB_PAT*相关变量保留无前缀
  readonly GITHUB_PAT1?: string
  readonly GITHUB_PAT2?: string
  readonly GITHUB_PAT3?: string
  readonly GITHUB_PAT4?: string
  readonly GITHUB_PAT5?: string
  readonly VITE_GITHUB_PAT1?: string
  readonly VITE_GITHUB_PAT2?: string
  readonly VITE_GITHUB_PAT3?: string
  readonly VITE_GITHUB_PAT4?: string
  readonly VITE_GITHUB_PAT5?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 