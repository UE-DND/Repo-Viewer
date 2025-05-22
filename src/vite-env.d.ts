/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SITE_TITLE?: string
  readonly VITE_SITE_TITLE?: string
  readonly GITHUB_REPO_OWNER?: string
  readonly VITE_GITHUB_REPO_OWNER?: string
  readonly GITHUB_REPO_NAME?: string
  readonly VITE_GITHUB_REPO_NAME?: string
  readonly GITHUB_REPO_BRANCH?: string
  readonly VITE_GITHUB_REPO_BRANCH?: string
  readonly IMAGE_PROXY_URL?: string
  readonly VITE_IMAGE_PROXY_URL?: string
  readonly HOMEPAGE_FILTER_ENABLED?: string
  readonly VITE_HOMEPAGE_FILTER_ENABLED?: string
  readonly HOMEPAGE_ALLOWED_FOLDERS?: string
  readonly VITE_HOMEPAGE_ALLOWED_FOLDERS?: string
  readonly HOMEPAGE_ALLOWED_FILETYPES?: string
  readonly VITE_HOMEPAGE_ALLOWED_FILETYPES?: string
  readonly USE_TOKEN_MODE?: string
  readonly VITE_USE_TOKEN_MODE?: string
  readonly DEVELOPER_MODE?: string
  readonly VITE_DEVELOPER_MODE?: string
  readonly HIDE_MAIN_FOLDER_DOWNLOAD?: string
  readonly VITE_HIDE_MAIN_FOLDER_DOWNLOAD?: string
  readonly HIDE_DOWNLOAD_FOLDERS?: string
  readonly VITE_HIDE_DOWNLOAD_FOLDERS?: string
  readonly OFFICE_PREVIEW_PROXY?: string
  readonly VITE_OFFICE_PREVIEW_PROXY?: string
  readonly DEBUG_MODE?: string
  readonly VITE_DEBUG_MODE?: string
  readonly CONSOLE_LOGGING?: string
  readonly VITE_CONSOLE_LOGGING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 