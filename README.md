# Repo-Viewer

基于MD3设计语言的GitHub仓库浏览网页应用。

## 目录

- [Repo-Viewer](#repo-viewer)
  - [目录](#目录)
  - [主要功能](#主要功能)
  - [本地开发](#本地开发)
  - [环境变量配置](#环境变量配置)
  - [部署指南](#部署指南)
    - [使用Vercel部署](#使用vercel部署)
  - [许可证](#许可证)

## 主要功能

- 🔍 **仓库浏览**：直观的文件结构导航
- 🔎 **文件搜索**：基于GitHub Actions预生成索引的快速文件检索
- 📄 **文件预览**：支持多种文件格式预览，包括Markdown、PDF和图片
- ⬇️ **文件下载**：可下载单个文件或整个文件夹
- 🔄 **响应式设计**：兼容桌面和移动设备
- 🔍 **内容过滤**：支持首页文件和文件夹过滤
- 🛠️ **开发者模式**：提供详细调试信息和性能统计
- 🌐 **SEO优化**：提高搜索引擎可见性
- 🔄 **备选代理支持**：支持多级代理自动故障转移，确保文件访问的可靠性

## 本地开发

按照以下步骤设置您的开发环境：

1. **克隆仓库**

2. **安装依赖**

   ```bash
   npm install
   ```

3. **创建环境配置**
   - 复制`env.local.txt`到`.env`文件

   ```bash
   cp env.local.txt .env
   ```

   - 编辑`.env`文件配置必要的环境变量
   - **注意**：`env.local.txt`为环境变量模板，现在使用统一的无前缀命名，系统会自动处理VITE_前缀映射

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

   - 开发服务器将在`http://localhost:3000`启动

## 环境变量配置

**必需的环境变量**:

```
# 基础配置
SITE_TITLE = 你的站点标题
SITE_DESCRIPTION = 你的站点描述,用于SEO
SITE_KEYWORDS = 关键词1, 关键词2, 关键词3
SITE_OG_IMAGE = /icon.svg
HOMEPAGE_FILTER_ENABLED = true
HOMEPAGE_ALLOWED_FOLDERS = docs,src
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
HIDE_MAIN_FOLDER_DOWNLOAD = false
HIDE_DOWNLOAD_FOLDERS = node_modules,dist
DOWNLOAD_PROXY_URL = https://your-proxy
DEVELOPER_MODE = false

# 仓库信息
GITHUB_REPO_OWNER = 仓库所有者
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）

# GitHub访问令牌
GITHUB_PAT1 = 你的GitHub个人访问令牌
GITHUB_PAT2 =                                       # 可选备用令牌
```

**可选的环境变量**:

```
# 首页内容过滤- 仅对仓库根目录（首页）生效
HOMEPAGE_FILTER_ENABLED = true或false           # 启用首页过滤功能
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2      # 允许在首页显示的文件夹
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt         # 允许在首页显示的文件类型

# 首页下载按钮控制- 仅对仓库根目录（首页）生效
HIDE_MAIN_FOLDER_DOWNLOAD = true或false         # 隐藏首页的主文件夹下载按钮
HIDE_DOWNLOAD_FOLDERS = folder1,folder2         # 首页上需要隐藏下载按钮的文件夹

# 搜索索引
SEARCH_INDEX_ENABLED = true或false             # 是否启用预生成的搜索功能
SEARCH_INDEX_BASE_PATH = indexes               # RV-Index 分支中索引文件所在目录（相对路径）
SEARCH_INDEX_BRANCH = RV-Index                 # 存放索引文件的专用分支
SEARCH_INDEX_MANIFEST_PATH = manifest.json     # 分支中记录索引列表的清单文件
SEARCH_INDEX_FALLBACK_RAW_URL =                # 可选 CDN 前缀，形如 https://cdn.xxx/${owner}/${repo}@${ref}
SEARCH_INDEX_MAX_RESULTS = 200                 # 搜索结果返回的最大数量

# 代理设置
DOWNLOAD_PROXY_URL = 下载代理URL                    # 主代理URL
DOWNLOAD_PROXY_URL_BACKUP1 =
DOWNLOAD_PROXY_URL_BACKUP2 =

# 开发者选项
DEVELOPER_MODE = true/false                     # 启用开发者模式
CONSOLE_LOGGING = true/false                   # 控制台日志
```

## 搜索索引构建

- GitHub Actions 工作流 `.github/workflows/generate-search-index.yml` 会在每次推送后自动遍历当前分支并生成索引文件，存放于专用分支 `RV-Index`，文件命名遵循 `<分支名>-<提交短哈希>-index.json`。
- 同一分支的最新索引映射记录在 `RV-Index` 分支根目录的 `manifest.json` 中，前端会读取该清单后拉取匹配的索引文件，无需污染其他分支历史。
- 需要手动刷新索引时，可在 GitHub Actions 面板中触发 `Build Search Index` 工作流，或复制工作流中的 Python 片段在本地执行，再将生成的文件推送到 `RV-Index` 分支。

## 部署指南

### 使用Vercel部署

1. **在GitHub上创建个人访问令牌（PAT）**:
   - 访问[GitHub设置→开发者设置→个人访问令牌](https://github.com/settings/tokens)
   - 创建一个或多个具有`repo`权限的令牌
   - 保存这些令牌，你将在下一步中使用它们

2. **在Vercel上导入你的仓库**:
   - 登录[Vercel](https://vercel.com)
   - 点击"Import Project"
   - 选择"Import Git Repository"并连接你的GitHub账号
   - 选择Repo-Viewer仓库

3. **配置环境变量**:
   - 在部署设置页面，找到"Environment Variables"部分
   - 添加必要的环境变量（见下方[Vercel环境变量配置](#vercel环境变量配置)）

4. **部署应用**:
   - 点击"Deploy"按钮
   - Vercel将自动构建和部署你的应用

## 许可证

本项目基于AGPL-3.0许可证开源。详见[LICENSE](LICENSE)文件。
