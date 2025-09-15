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
    - [Cloudflare Worker配置](#cloudflare-worker配置)
      - [Worker部署步骤](#worker部署步骤)
  - [故障排除](#故障排除)
    - [API限流问题](#api限流问题)
    - [部署问题](#部署问题)
    - [内容过滤问题](#内容过滤问题)
  - [技术栈](#技术栈)
  - [许可证](#许可证)

## 主要功能

- 🔍 **仓库浏览**：直观的文件结构导航
- 📄 **文件预览**：支持多种文件格式预览，包括Markdown、PDF和图片
- ⬇️ **文件下载**：可下载单个文件或整个文件夹
- 🔄 **响应式设计**：兼容桌面和移动设备
- 🔍 **内容过滤**：支持首页文件和文件夹过滤
- 🛠️ **开发者模式**：提供详细调试信息和性能统计
- 🌐 **SEO优化**：动态元标签以提高搜索引擎可见性和社交分享

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

> ⚠️ **重要**：对于本地开发，您**必须**使用带VITE_前缀的变量，否则前端无法读取环境变量！  
> 在生产环境（如Vercel），只有以下变量**不**需要VITE_前缀。所有需要被前端读取的其他变量**必须**带有VITE_前缀：
>
> - GITHUB_PAT1
> - OFFICE_PREVIEW_PROXY

**必需的环境变量**:

```
# 基础配置
VITE_SITE_TITLE = 你的站点标题
VITE_SITE_DESCRIPTION = 你的站点描述,用于SEO
VITE_SITE_KEYWORDS = 关键词1, 关键词2, 关键词3
VITE_SITE_OG_IMAGE = /icon.svg
VITE_SITE_TWITTER_HANDLE = @你的推特句柄
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false
VITE_GITHUB_REPO_OWNER = 仓库所有者
VITE_GITHUB_REPO_NAME = 仓库名称
VITE_GITHUB_REPO_BRANCH = 分支名称（默认为main）

# 仓库信息
VITE_GITHUB_PAT1 = 你的GitHub个人访问令牌
VITE_OFFICE_PREVIEW_PROXY = Worker URL
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
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# 仓库信息
GITHUB_REPO_OWNER = 仓库所有者
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）
GITHUB_PAT1 = 你的GitHub个人访问令牌
OFFICE_PREVIEW_PROXY = Worker URL
```

**可选的环境变量**:

```
# SEO设置（可选）
SITE_TWITTER_HANDLE = @你的推特句柄

# 首页内容过滤（可选）- 仅对仓库根目录（首页）生效
HOMEPAGE_FILTER_ENABLED = true或false           # 启用首页过滤功能
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2      # 允许在首页显示的文件夹
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt         # 允许在首页显示的文件类型

# 首页下载按钮控制（可选）- 仅对仓库根目录（首页）生效
HIDE_MAIN_FOLDER_DOWNLOAD = true或false         # 隐藏首页的主文件夹下载按钮
HIDE_DOWNLOAD_FOLDERS = folder1,folder2         # 首页上需要隐藏下载按钮的文件夹

# 代理设置（可选）
IMAGE_PROXY_URL = 图片代理URL                    # 图片代理URL

# Office文档预览（可选）
OFFICE_PREVIEW_PROXY = Worker URL                # Worker代理URL

# 开发者选项（可选）
DEVELOPER_MODE = true或false                     # 启用开发者模式
```

### Cloudflare Worker配置

如果你需要支持在线预览Office文档，可以配置Cloudflare Worker作为代理服务：

#### Worker部署步骤

1. **创建Cloudflare账户**:
   - 访问[Cloudflare网站](https://www.cloudflare.com/)并注册账户

2. **部署Worker**:
   - 登录Cloudflare控制面板
   - 导航至"Workers & Pages"
   - 点击"创建Worker"
   - 将项目根目录中的`worker.js`文件内容复制到Worker编辑器中
   - 点击"保存并部署"以部署Worker
   - 记下Worker URL（例如，`https://your-worker.your-account.workers.dev`）

3. **配置应用使用Worker**:
   - 添加到Vercel环境变量:

   ```
   OFFICE_PREVIEW_PROXY = {你的Worker URL}
   ```

   - 或添加到本地开发`.env`文件:

   ```
   VITE_OFFICE_PREVIEW_PROXY = {你的Worker URL}
   ```

4. **绑定自定义域名（可选但推荐）**:
   - 在Cloudflare控制面板中，前往"Workers & Pages"
   - 选择你的Worker
   - 点击"Triggers"选项卡
   - 在"Custom Domains"部分，点击"Add Custom Domain"
   - 输入你拥有的域名（例如，`worker.example.com`）
   - 确保该域名已在Cloudflare DNS中管理
   - 点击"Add Custom Domain"完成设置

5. **配置路由（通配符路由）**:
   - 在Cloudflare控制面板中，前往"Workers & Pages"
   - 选择你的Worker
   - 点击"Triggers"选项卡
   - 在"Routes"部分，点击"Add Route"
   - 添加路由规则，例如：
     - 精确路径：`example.com/proxy/*`（匹配指定路径下的所有请求）
     - 子域名：`worker.example.com/*`（匹配子域名下的所有请求）
     - 通配符域名：`*.example.com/proxy/*`（匹配所有子域名上的指定路径）
   - 重要注意事项：
     - 单通配符（`*`）匹配单个路径段，不跨越斜杠
     - 双通配符（`**`）匹配多个路径段，可以跨越斜杠
     - 示例：`example.com/proxy/*`仅匹配`example.com/proxy/file`，不匹配`example.com/proxy/folder/file`

## 故障排除

如果您在部署或使用过程中遇到问题：

### API限流问题

1. 确保您已正确配置GitHub个人访问令牌
2. 检查您的令牌是否具有正确的权限（`repo`范围）
3. 对于高流量站点，考虑添加多个PAT进行轮换
4. 在GitHub的开发者设置中验证令牌使用情况

### 部署问题

1. 检查所有必需的环境变量是否正确设置
2. 确保您的仓库对Vercel具有必要的权限
3. 查看Vercel构建日志以获取任何特定错误消息
4. 检查您的GitHub令牌是否已过期
5. 如果使用自定义域名，确保DNS配置正确且SSL证书已激活
6. 如果使用通配符路由，验证您的路由规则是否正确匹配请求URL

### 内容过滤问题

如果内容过滤功能不按预期工作：

1. 确认`HOMEPAGE_FILTER_ENABLED`设置为`true`
2. 检查`HOMEPAGE_ALLOWED_FOLDERS`和`HOMEPAGE_ALLOWED_FILETYPES`是否正确配置
3. 确保文件夹名称和文件类型名称与实际仓库内容匹配
4. 如需更多问题排查，启用开发者模式查看详细日志

## 技术栈

- React, TypeScript, Vite
- Material UI组件库
- Vercel Serverless Functions
- Cloudflare Workers (用于Office文档预览代理)
- SEO优化与动态元标签

## 许可证

本项目基于AGPL-3.0许可证开源。详见[LICENSE](LICENSE)文件。
