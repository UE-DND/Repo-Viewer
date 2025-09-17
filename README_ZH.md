# Repo-Viewer

基于MD3设计语言的GitHub仓库浏览网页应用。

中文 | [English](README.md)

## 目录

- [Repo-Viewer](#repo-viewer)
  - [目录](#目录)
  - [主要功能](#主要功能)
  - [本地开发](#本地开发)
    - [本地环境变量](#本地环境变量)
  - [部署指南](#部署指南)
    - [Vercel部署](#vercel部署)
      - [安全部署方法](#安全部署方法)
      - [部署步骤](#部署步骤)
      - [Vercel环境变量配置](#vercel环境变量配置)
  - [许可证](#许可证)

## 主要功能

- 🔍 **仓库浏览**：直观的文件结构导航
- 📄 **文件预览**：支持多种文件格式预览，包括Markdown、PDF和图片
- ⬇️ **文件下载**：可下载单个文件或整个文件夹
- 🔄 **响应式设计**：兼容桌面和移动设备
- 🔍 **内容过滤**：支持首页文件和文件夹过滤
- 🛠️ **开发者模式**：提供详细调试信息和性能统计
- 🌐 **SEO优化**：提高搜索引擎可见性
- 🔄 **备选代理支持**：支持多级代理自动故障转移，确保文件访问的可靠性

## 本地开发

想要在本地环境开发和调试这个项目吗？按照以下步骤设置您的开发环境：

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
   - **注意**：`env.local.txt`仅为本地开发模板，变量名格式（带`VITE_`前缀）仅用于本地开发环境

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

   - 开发服务器将在`http://localhost:3000`启动

### 本地环境变量

> ⚠️ **重要**：仓库信息变量（`GITHUB_REPO_*` / `VITE_GITHUB_REPO_*`）在本地与生产环境都会自动同步。  
> - 推荐仅维护无前缀的 `GITHUB_REPO_*`，即可同时满足前端与服务端读取需求。
> - 如果已经配置了 `VITE_` 前缀，也无需修改，系统会自动兼容两种命名。
> - PAT (`GITHUB_PAT*`) 仍建议仅在服务端使用无前缀形式，避免泄露；本地开发若仅设置无前缀变量，开发服务器会自动同步到 `VITE_GITHUB_PAT*` 以便调试。

**必需的环境变量**:

```
# 基础配置
VITE_SITE_TITLE = 你的站点标题
VITE_SITE_DESCRIPTION = 你的站点描述,用于SEO
VITE_SITE_KEYWORDS = 关键词1, 关键词2, 关键词3
VITE_SITE_OG_IMAGE = /icon.svg
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_DOWNLOAD_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# 仓库信息
GITHUB_REPO_OWNER = 仓库所有者                      # 推荐：无前缀写法，后端与前端同时生效
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）
# VITE_GITHUB_REPO_OWNER = 仓库所有者               # 兼容旧写法（可选）
# VITE_GITHUB_REPO_NAME = 仓库名称
# VITE_GITHUB_REPO_BRANCH = 分支名称（默认为main）
GITHUB_PAT1 = 你的GitHub个人访问令牌               # 推荐：仅在服务端与本地保存无前缀变量
GITHUB_PAT2 =                                       # 可选备用令牌
# VITE_GITHUB_PAT1 = 你的GitHub个人访问令牌        # 可选 - 需要暴露给前端时使用
# VITE_GITHUB_PAT2 =
```

**可选的环境变量**:

```
# 首页内容过滤- 仅对仓库根目录（首页）生效
VITE_HOMEPAGE_FILTER_ENABLED = true或false           # 启用首页过滤功能
VITE_HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2      # 允许在首页显示的文件夹
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt         # 允许在首页显示的文件类型

# 首页下载按钮控制- 仅对仓库根目录（首页）生效
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = true或false         # 隐藏首页的主文件夹下载按钮
VITE_HIDE_DOWNLOAD_FOLDERS = folder1,folder2         # 首页上需要隐藏下载按钮的文件夹

# 代理设置
VITE_DOWNLOAD_PROXY_URL = 下载代理URL                    # 主代理URL
VITE_DOWNLOAD_PROXY_URL_BACKUP1 = 备选代理URL             # 备选代理1 - 自动故障转移
VITE_DOWNLOAD_PROXY_URL_BACKUP2 = 备选代理URL2            # 备选代理2 - 多级故障转移

# 开发者选项
VITE_DEVELOPER_MODE = true或false                     # 启用开发者模式
```
## 部署指南

### Vercel部署

#### 安全部署方法

在Vercel部署时，GitHub访问令牌（PAT）通过以下方式保护：

1. 令牌存储为Vercel环境变量，无`VITE_`前缀，因此不会打包进前端代码
2. 使用服务端API端点处理所有需要GitHub认证的请求
3. 支持多个PAT轮换，在令牌配额用尽或过期时自动切换

#### 部署步骤

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

#### Vercel环境变量配置

**必需的环境变量**:

```
# 基础配置
VITE_SITE_TITLE = 你的站点标题
VITE_SITE_DESCRIPTION = 你的站点描述,用于SEO
VITE_SITE_KEYWORDS = 关键词1, 关键词2, 关键词3
VITE_SITE_OG_IMAGE = /icon.svg
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_DOWNLOAD_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# 仓库信息
GITHUB_REPO_OWNER = 仓库所有者                 # 推荐：仅设置无前缀变量，避免静态构建时暴露
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）
# 可选：如需兼容旧配置，也可以额外设置 VITE_GITHUB_REPO_OWNER/VITE_GITHUB_REPO_NAME/VITE_GITHUB_REPO_BRANCH
GITHUB_PAT1 = 你的GitHub个人访问令牌
```

**可选的环境变量**:

```
# 首页内容过滤- 仅对仓库根目录（首页）生效
VITE_HOMEPAGE_FILTER_ENABLED = true或false           # 启用首页过滤功能
VITE_HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2      # 允许在首页显示的文件夹
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt         # 允许在首页显示的文件类型

# 首页下载按钮控制- 仅对仓库根目录（首页）生效
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = true或false         # 隐藏首页的主文件夹下载按钮
VITE_HIDE_DOWNLOAD_FOLDERS = folder1,folder2         # 首页上需要隐藏下载按钮的文件夹

# 代理设置
VITE_DOWNLOAD_PROXY_URL = 下载代理URL                    # 主代理URL
VITE_DOWNLOAD_PROXY_URL_BACKUP1 = 备选代理URL             # 备选代理1 - 自动故障转移
VITE_DOWNLOAD_PROXY_URL_BACKUP2 = 备选代理URL2            # 备选代理2 - 多级故障转移

# 开发者选项
VITE_DEVELOPER_MODE = true或false                     # 启用开发者模式
```

## 许可证

本项目基于AGPL-3.0许可证开源。详见[LICENSE](LICENSE)文件。
