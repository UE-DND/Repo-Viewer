```
██████╗ ███████╗██████╗  ██████╗       ██╗   ██╗██╗███████╗██╗    ██╗███████╗██████╗ 
██╔══██╗██╔════╝██╔══██╗██╔═══██╗      ██║   ██║██║██╔════╝██║    ██║██╔════╝██╔══██╗
██████╔╝█████╗  ██████╔╝██║   ██║█████╗██║   ██║██║█████╗  ██║ █╗ ██║█████╗  ██████╔╝
██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║╚════╝╚██╗ ██╔╝██║██╔══╝  ██║███╗██║██╔══╝  ██╔══██╗
██║  ██║███████╗██║     ╚██████╔╝       ╚████╔╝ ██║███████╗╚███╔███╔╝███████╗██║  ██║
╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝         ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝
```

***基于MD3设计语言的GitHub仓库浏览应用***

## 目录

- [目录](#目录)
- [主要功能](#主要功能)
- [本地开发](#本地开发)
- [环境变量配置](#环境变量配置)
- [搜索索引构建](#搜索索引构建)
- [部署指南](#部署指南)
  - [使用Vercel部署](#使用vercel部署)
- [许可证](#许可证)
- [贡献者](#贡献者)
- [Vercel 加速支持](#vercel-加速支持)
- [Stars](#stars)

## 主要功能

- 🔍 **仓库浏览**：直观的文件结构导航
- 🔎 **文件搜索**：基于 GitHub Actions 预生成索引的快速检索，并支持实时 API 兜底
- 📄 **文件预览**：支持多种文件格式预览，包括 Markdown、PDF 和图片
- ⬇️ **文件下载**：可下载单个文件或整个文件夹
- 🔄 **响应式设计**：兼容桌面和移动设备
- 🔍 **内容过滤**：支持首页文件和文件夹过滤
- 🛠️ **开发者模式**：提供详细调试信息和性能统计
- 🌐 **SEO 优化**：提高搜索引擎可见性
- 🔄 **备选代理支持**：支持多级代理自动故障转移，确保文件访问的可靠性

## 本地开发

按照以下步骤设置您的开发环境：

1. **克隆仓库**
2. **安装依赖**

   ```bash
   npm install
   ```

3. **创建环境配置**
   - 复制 `.env.example` 到 `.env` 并修改

     ```bash
     cp .env.example .env
     ```

   - 编辑 `.env` 文件配置必要的环境变量
   - **提示**：`.env.example` 使用统一的无前缀变量名，构建过程会自动映射为 `VITE_` 前缀

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

   - 开发服务器将在 `http://localhost:3000` 启动

## 环境变量配置

**必需的环境变量**:

```env
# 基础配置
SITE_TITLE =                                          # 你的站点标题
SITE_DESCRIPTION =                                    # 你的站点描述,用于SEO
SITE_KEYWORDS =                                       # 关键词1, 关键词2, 关键词3
SITE_OG_IMAGE = /icon.svg                             # 站点图标

# 仓库信息
GITHUB_REPO_OWNER =                                   # 仓库所有者
GITHUB_REPO_NAME =                                    # 仓库名称
GITHUB_REPO_BRANCH =                                  # 分支名称（默认为main）

# GitHub访问令牌
GITHUB_PAT1 =                                         # 个人GitHub令牌
GITHUB_PAT2 =                                         # 可选备用令牌
```

**可选的环境变量**:

```env
# 首页内容过滤 - 仅对仓库根目录（首页）生效
HOMEPAGE_FILTER_ENABLED = true/false                  # 启用首页过滤功能
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2            # 允许在首页显示的文件夹
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt               # 允许在首页显示的文件类型

# 首页下载按钮控制 - 仅对仓库根目录（首页）生效
HIDE_MAIN_FOLDER_DOWNLOAD = true/false                # 隐藏首页的主文件夹下载按钮
HIDE_DOWNLOAD_FOLDERS = folder1,folder2               # 首页上需要隐藏下载按钮的文件夹

# 搜索索引配置 - 配合 RV-Index 分支的预生成索引
SEARCH_INDEX_ENABLED = true/false                     # 是否启用预生成索引搜索
SEARCH_INDEX_BASE_PATH = indexes                      # 索引文件所在目录
SEARCH_INDEX_BRANCH = RV-Index                        # 索引文件所在分支
SEARCH_INDEX_MANIFEST_PATH = manifest.json            # 清单文件名称
SEARCH_INDEX_MAX_RESULTS = 200                        # 搜索结果返回的最大数量
SEARCH_INDEX_FALLBACK_RAW_URL =                       # 可选 CDN 前缀，形如 https://cdn.xxx/${owner}/${repo}@${ref}

# 代理设置
DOWNLOAD_PROXY_URL =                                  # 主代理URL
DOWNLOAD_PROXY_URL_BACKUP1 =                          # 备选代理1
DOWNLOAD_PROXY_URL_BACKUP2 =                          # 备选代理2

# 开发者选项
DEVELOPER_MODE = true/false                           # 启用开发者模式
CONSOLE_LOGGING = true/false                          # 控制台日志
```

## 搜索索引构建

- GitHub Actions 工作流 `.github/workflows/generate-search-index.yml` 会在每次推送后自动遍历目标分支并生成索引文件，存放于专用分支 `RV-Index`，文件命名遵循 `<分支名>-<提交短哈希>-index.json`。
- 同一分支的最新索引映射记录在 `RV-Index` 分支根目录的 `manifest.json` 中，前端读取清单后即可拉取对应索引文件，无需污染其他分支历史。
- 需要手动刷新索引时，可在 GitHub Actions 面板中触发 **Build Search Index** 工作流，或按工作流中的 Python 脚本在本地生成文件并推送到 `RV-Index` 分支。

## 部署指南

### 使用Vercel部署

1. **在GitHub上创建个人访问令牌（PAT）**:
   - 访问 [GitHub设置→开发者设置→个人访问令牌](https://github.com/settings/tokens)
   - 创建一个或多个具有 `repo` 权限的令牌
   - 保存这些令牌，你将在下一步中使用它们

2. **在Vercel上导入你的仓库**:
   - 登录 [Vercel](https://vercel.com)
   - 点击 "Import Project"
   - 选择 "Import Git Repository" 并连接你的 GitHub 账号
   - 选择 Repo-Viewer 仓库

3. **配置环境变量**:
   - 在部署设置页面，找到 "Environment Variables" 部分
   - 添加必要的环境变量

4. **部署应用**:
   - 点击 "Deploy" 按钮
   - Vercel 将自动构建和部署你的应用

## 许可证

本项目基于 AGPL-3.0 许可证开源。详见 [LICENSE](LICENSE) 文件。

## 贡献者

<a href="https://github.com/UE-DND/Repo-Viewer/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=UE-DND/Repo-Viewer"/>
</a>

## Vercel 加速支持

[xingpingcn/enhanced-FaaS-in-China](https://github.com/xingpingcn/enhanced-FaaS-in-China)

## Stars

![Star History](https://api.star-history.com/svg?repos=UE-DND/Repo-Viewer&type=Date)
