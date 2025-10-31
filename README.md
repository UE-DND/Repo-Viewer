# Repo-Viewer

***基于 Material Design 3设计风格的 GitHub仓库浏览应用***

[**🖥️ 在线演示**](https://repoviewer.uednd.top)
[**⚙️ Dev 预览**](https://repoviewer-dev.uednd.top)

![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1.19-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Material-UI](https://img.shields.io/badge/Material--UI-7.0.2-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.14.0-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-1.9.0-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.1.9-3E67B1?style=for-the-badge&logo=zod&logoColor=white)

![Preview Dark](docs/image/dark.png)

<table>
  <tr>
    <td><img alt="" src="docs/image/phone_1.png"></td>
    <td><img alt="" src="docs/image/phone_2.png"></td>
    <td><img alt="" src="docs/image/phone_3.png"></td>
  <tr>
</table>

### 主要功能

- 🔍 **仓库浏览**：直观的文件结构导航，同时提供首页文件和文件夹过滤
- 📄 **文件预览**：支持多种文件格式预览，目前包括 `Markdown`、 `PDF` 和 `图片`
- ⬇️ **文件下载**：可下载单个文件或整个文件夹
- 🌐 **SEO优化**：提高搜索引擎可见性

### 本地开发

1. **克隆仓库**

    ```bash
    git clone https://github.com/UE-DND/Repo-Viewer.git
    cd Repo-Viewer
    ```

2. **安装依赖**

    ```bash
   npm install --legacy-peer-deps
   ```

3. **创建环境配置**：复制 `.env.example` 到 `.env` 并配置必要的环境变量（参见下方内容）

   ```bash
   cp .env.example .env
   ```

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

### 环境变量配置

**必需的环境变量**:

```env
# 基础配置，用于SEO
SITE_TITLE =                                          # 站点标题
SITE_DESCRIPTION =                                    # 站点描述
SITE_OG_IMAGE = /icon.svg                             # 站点图标
SITE_KEYWORDS =                                       # 站点关键词，可用逗号分隔

# 仓库信息
GITHUB_REPO_OWNER =                                   # 仓库所有者
GITHUB_REPO_NAME =                                    # 仓库名称
GITHUB_REPO_BRANCH =                                  # 分支名称（默认为main）

# GitHub访问令牌
GITHUB_PAT1 =                                         # 个人GitHub令牌
GITHUB_PAT2 =                                         # 【可选】备用令牌
```

**可选的环境变量（以下任意变量均可忽略）**:

```env
# 首页内容过滤- 仅对仓库根目录（首页）生效
HOMEPAGE_FILTER_ENABLED = true||false                 # 启用首页过滤功能
HOMEPAGE_ALLOWED_FOLDERS = folder1, folder2           # 允许在首页显示的文件夹，可用逗号分隔
HOMEPAGE_ALLOWED_FILETYPES = md, pdf, txt             # 允许在首页显示的文件类型，可用逗号分隔

# 首页下载按钮控制- 仅对仓库根目录（首页）生效
HIDE_MAIN_FOLDER_DOWNLOAD = true||false               # 隐藏首页的主文件夹下载按钮
HIDE_DOWNLOAD_FOLDERS = folder1, folder2              # 首页上需要隐藏下载按钮的文件夹，可用逗号分隔

# 文件下载代理设置（仅用于下载功能，不影响内容浏览）
DOWNLOAD_PROXY_URL =                                  # 下载主代理URL
DOWNLOAD_PROXY_URL_BACKUP1 =                          # 下载备用代理URL1
DOWNLOAD_PROXY_URL_BACKUP2 =                          # 下载备用代理URL2

# 开发者选项
DEVELOPER_MODE = true||false                          # 启用开发者模式
CONSOLE_LOGGING = true||false                         # 控制台日志
```

### 部署指南

##### 使用Vercel部署

1. **在GitHub上创建个人访问令牌（PAT）**:
   - 访问[GitHub设置→开发者设置→个人访问令牌](https://github.com/settings/tokens)
   - 创建一个或多个具有`repo`权限的令牌
   - 保存这些令牌，你将在下一步中使用它们

2. **在Vercel上导入你的仓库**:
   - 登录[Vercel](https://vercel.com)
   - 点击`Import Project`
   - 选择`Import Git Repository`并连接你的GitHub账号
   - 选择Repo-Viewer仓库

3. **配置环境变量**:
   - 在部署设置页面，找到`Environment Variables`部分
   - 添加必要的环境变量

4. **部署应用**:
   - 点击`Deploy`按钮
   - Vercel将自动构建和部署你的应用

### Dev 预览

想要查看项目的最新开发进度？通过 [Repo-Viewer/dev](https://repoviewer-dev.uednd.top) 预览 `dev` 分支的最新特性。

### 许可证

本项目使用 **AGPL-3.0** 许可证。

- ✅ 可以自由使用、修改和分发
- ⚠️ 必须开源修改后的代码并保留原作者版权信息
- ⚠️ 网络部署也需要开源
- ⚠️ 修改后的版本必须使用相同的 AGPL-3.0 许可证

> 完整条款见 [[LICENSE](LICENSE)]

### 贡献者

[![Contributors](https://contrib.rocks/image?repo=UE-DND/Repo-Viewer)](https://github.com/UE-DND/Repo-Viewer/graphs/contributors)

### Stars

![Star History](https://api.star-history.com/svg?repos=UE-DND/Repo-Viewer&type=Date)
