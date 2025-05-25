# Repo-Viewer

一个基于MD3设计语言的GitHub仓库浏览应用。

中文 | [English](README_EN.md)

## 目录

- [主要功能](#主要功能)
- [本地开发](#本地开发)
  - [本地环境变量配置](#本地环境变量配置)
- [部署指南](#部署指南)
  - [Vercel部署](#vercel部署)
    - [Vercel环境变量配置](#vercel环境变量配置)
  - [Cloudflare Worker配置](#cloudflare-worker配置)
- [故障排除](#故障排除)
- [技术栈](#技术栈)
- [许可](#许可)

## 主要功能

- 🔍 **仓库浏览**：直观的文件夹结构导航
- 📄 **文件预览**：支持Markdown、PDF和图像等多种文件格式的预览
- ⬇️ **文件下载**：下载单个文件或整个文件夹
- 🔄 **响应式设计**：适配桌面和移动设备
- 🔍 **内容过滤**：支持首页文件和文件夹过滤
- 🛠️ **开发者模式**：提供详细调试信息和性能统计

## 本地开发

想要在本地环境开发和调试本项目？按照以下步骤设置开发环境：

1. **克隆仓库**

2. **安装依赖**
   ```bash
   npm install
   ```

3. **创建环境配置**
   - 复制`env.local.txt`为`.env`文件
   ```bash
   cp env.local.txt .env
   ```
   - 编辑`.env`文件，配置必要的环境变量
   - **注意**: `env.local.txt`仅作为本地开发的模板，其中的变量名格式（带`VITE_`前缀）仅用于本地开发环境

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   - 开发服务器将在`http://localhost:3000`启动

### 本地环境变量配置

> ⚠️ **重要提示**：本地开发**必须**使用 VITE_ 前缀的变量，否则前端无法读取环境变量！  
> 生产环境（如Vercel）只有下列变量不用 VITE_ 前缀，其它所有需要前端读取的变量都必须加 VITE_ 前缀：
> - GITHUB_REPO_OWNER
> - GITHUB_REPO_NAME
> - GITHUB_REPO_BRANCH
> - GITHUB_PAT1
> - OFFICE_PREVIEW_PROXY

**必需的环境变量**:
```
# 基础配置 (本地开发和生产前端都必须用VITE_前缀，除仓库信息)
VITE_SITE_TITLE = 你的站点标题
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# 仓库信息（生产环境不用VITE_前缀，后端读取）
GITHUB_REPO_OWNER = 仓库所有者
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）
GITHUB_PAT1 = 你的GitHub个人访问令牌
OFFICE_PREVIEW_PROXY = Worker URL
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
SITE_TITLE = 你的站点标题
GITHUB_REPO_OWNER = 仓库所有者
GITHUB_REPO_NAME = 仓库名称
GITHUB_REPO_BRANCH = 分支名称（默认为main）

# GitHub令牌（至少需要一个）
GITHUB_PAT1 = 你的GitHub个人访问令牌
```

**可选的环境变量**:
```
# 首页内容过滤（可选）- 仅对仓库根目录（首页）生效
HOMEPAGE_FILTER_ENABLED = true或false           # 启用首页过滤功能
HOMEPAGE_ALLOWED_FOLDERS = 文件夹1,文件夹2       # 在首页允许显示的文件夹
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt        # 在首页允许显示的文件类型

# 首页下载按钮控制（可选）- 仅对仓库根目录（首页）生效
HIDE_MAIN_FOLDER_DOWNLOAD = true或false        # 是否隐藏首页主文件夹的下载按钮
HIDE_DOWNLOAD_FOLDERS = 文件夹1,文件夹2         # 首页需要隐藏下载按钮的文件夹

# 代理设置（可选）
IMAGE_PROXY_URL = 图片代理URL                  # 图片代理URL

# Office文档预览（可选）
OFFICE_PREVIEW_PROXY = Worker URL             # Worker代理URL

# 开发者选项（可选）
DEVELOPER_MODE = true或false                  # 是否启用开发者模式
```

### Cloudflare Worker配置

如需支持Office文档在线预览功能，您可以配置Cloudflare Worker作为代理服务：

#### Worker部署步骤

1. **创建Cloudflare账号**:
   - 访问[Cloudflare官网](https://www.cloudflare.com/)并注册账号

2. **部署Worker**:
   - 登录Cloudflare控制台
   - 导航到"Workers & Pages"
   - 点击"Create Worker"
   - 将项目根目录中的`worker.js`文件内容复制到Worker编辑器中
   - 点击"Save and Deploy"部署Worker
   - 记下Worker的URL（例如：`https://your-worker.your-account.workers.dev`）

3. **配置应用使用Worker**:
   - 在Vercel环境变量中添加：
   ```
   OFFICE_PREVIEW_PROXY = {你的Worker URL}
   ```
   - 或在本地开发的`.env`文件中添加：
   ```
   VITE_OFFICE_PREVIEW_PROXY = {你的Worker URL}
   ```

4. **绑定自定义域名（可选但推荐）**:
   - 在Cloudflare控制台中，进入"Workers & Pages"
   - 选择你的Worker
   - 点击"Triggers"标签
   - 在"Custom Domains"部分点击"Add Custom Domain"
   - 输入你拥有的域名（如：`worker.example.com`）
   - 确保该域名已经在Cloudflare DNS管理中
   - 点击"Add Custom Domain"完成添加

5. **配置路由（通配符路由）**:
   - 在Cloudflare控制台中，进入"Workers & Pages"
   - 选择你的Worker
   - 点击"Triggers"标签
   - 在"Routes"部分点击"Add Route"
   - 添加路由规则，例如：
     * 精确路径：`example.com/proxy/*`（匹配指定路径下的所有请求）
     * 子域名：`worker.example.com/*`（匹配子域名下的所有请求）
     * 通配符域名：`*.example.com/proxy/*`（匹配所有子域名下的指定路径）
   - 注意事项：
     * 通配符（`*`）匹配单个路径段，不跨越斜杠
     * 双通配符（`**`）匹配多个路径段，可跨越斜杠
     * 示例：`example.com/proxy/*`只匹配`example.com/proxy/file`，不匹配`example.com/proxy/folder/file`
     * 示例：`example.com/proxy/**`匹配`example.com/proxy/folder/file`

6. **测试文档预览**:
   - 部署完成后，打开应用
   - 尝试预览一个Office文档（如.docx、.xlsx或.pptx）
   - 系统将自动使用Worker代理来预览文档

## 故障排除

遇到问题？以下是常见问题和解决方案：

### API访问问题

如果遇到GitHub API访问问题：

1. 确认环境变量已正确设置
2. 检查PAT是否具有必要的权限(`repo`对于私有仓库，`public_repo`对于公开仓库)
3. 确认PAT未过期
4. 查看Vercel的函数日志以获取详细错误信息
5. 如果启用了开发者模式，检查控制台的详细日志

### Office文档预览问题

如果Office文档预览不工作：

1. 确认Cloudflare Worker已正确部署
2. 检查`OFFICE_PREVIEW_PROXY`环境变量是否正确设置
3. 查看浏览器控制台中的错误信息
4. 在Cloudflare Workers控制台中检查Worker日志
5. 如果使用了自定义域名，确保DNS已正确配置且SSL证书已激活
6. 若使用通配符路由，检查路由规则是否正确匹配请求URL

### 内容过滤问题

如果内容过滤功能不按预期工作：

1. 确认`HOMEPAGE_FILTER_ENABLED`设置为`true`
2. 检查`HOMEPAGE_ALLOWED_FOLDERS`和`HOMEPAGE_ALLOWED_FILETYPES`配置是否正确
3. 确保文件夹名称和文件类型名称与实际仓库内容匹配
4. 如有更多疑问，启用开发者模式查看详细日志

## 技术栈

- React、TypeScript、Vite
- Material UI组件库
- Vercel Serverless Functions
- Cloudflare Workers (用于Office文档预览代理)

## 许可

本项目采用AGPL-3.0许可证。详情请参阅[LICENSE](LICENSE)文件。 