# Repo-Viewer

A GitHub repository browsing web application based on the MD3 design language.

English | [中文](README_ZH.md)

## Table of Contents

- [Repo-Viewer](#repo-viewer)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Local Development](#local-development)
  - [Environment Variables Configuration](#environment-variables-configuration)
  - [Deployment Guide](#deployment-guide)
    - [Deploy with Vercel](#deploy-with-vercel)
  - [License](#license)

## Key Features

- 🔍 **Repository Browsing**: Intuitive file structure navigation
- 📄 **File Preview**: Support for previewing multiple file formats including Markdown, PDF, and images
- ⬇️ **File Download**: Download individual files or entire folders
- 🔄 **Responsive Design**: Compatible with desktop and mobile devices
- 🔍 **Content Filtering**: Support for filtering files and folders on the homepage
- 🛠️ **Developer Mode**: Provides detailed debugging information and performance statistics
- 🌐 **SEO Optimization**: Improve search engine visibility
- 🔄 **Backup Proxy Support**: Support for multi-level proxy automatic failover, ensuring reliable file access

## Local Development

Follow these steps to set up your development environment:

1. **Clone the Repository**

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Create Environment Configuration**
   - Copy `env.local.txt` to `.env` file

   ```bash
   cp env.local.txt .env
   ```

   - Edit the `.env` file to configure the necessary environment variables
   - **Note**: `env.local.txt` is the environment variable template, now using unified prefix-free naming with automatic VITE_ prefix mapping

4. **Start the Development Server**

   ```bash
   npm run dev
   ```

   - The development server will start at `http://localhost:3000`

## Environment Variables Configuration

**Required Environment Variables**:

```
# Basic Configuration
SITE_TITLE = Your Site Title
SITE_DESCRIPTION = Your site description for SEO
SITE_KEYWORDS = keyword1, keyword2, keyword3
SITE_OG_IMAGE = /icon.svg
HOMEPAGE_FILTER_ENABLED = true
HOMEPAGE_ALLOWED_FOLDERS = docs,src
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
HIDE_MAIN_FOLDER_DOWNLOAD = false
HIDE_DOWNLOAD_FOLDERS = node_modules,dist
DOWNLOAD_PROXY_URL = https://your-proxy
DEVELOPER_MODE = false

# Repository Information
GITHUB_REPO_OWNER = Repository Owner
GITHUB_REPO_NAME = Repository Name
GITHUB_REPO_BRANCH = Branch Name (defaults to main)

# GitHub Access Tokens
GITHUB_PAT1 = Your GitHub Personal Access Token
GITHUB_PAT2 =                                        # Optional secondary token
```

**Optional Environment Variables**:

```
# Homepage Content Filtering - Only affects the repository root directory (homepage)
HOMEPAGE_FILTER_ENABLED = true or false           # Enable homepage filtering
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2        # Folders allowed to be displayed on homepage
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt           # File types allowed to be displayed on homepage

# Homepage Download Button Control - Only affects the repository root directory (homepage)
HIDE_MAIN_FOLDER_DOWNLOAD = true or false         # Hide download button for the main folder on homepage
HIDE_DOWNLOAD_FOLDERS = folder1,folder2           # Folders on homepage to hide download button for

# Proxy Settings
DOWNLOAD_PROXY_URL = Download Proxy URL                 # Primary proxy URL
DOWNLOAD_PROXY_URL_BACKUP1 =
DOWNLOAD_PROXY_URL_BACKUP2 =

# Developer Options
DEVELOPER_MODE = true/false                     # Enable developer mode
DEBUG_MODE = true/false                        # Enable debug mode
CONSOLE_LOGGING = true/false                   # Console logging
```

## Deployment Guide

### Deploy with Vercel

1. **Create Personal Access Tokens (PATs) on GitHub**:
   - Visit [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
   - Create one or more tokens with `repo` permissions
   - Save these tokens; you'll use them in the next step

2. **Import Your Repository on Vercel**:
   - Log in to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Select "Import Git Repository" and connect your GitHub account
   - Select the Repo-Viewer repository

3. **Configure Environment Variables**:
   - On the deployment settings page, find the "Environment Variables" section
   - Add the necessary environment variables (see the [Environment Variables Configuration](#environment-variables-configuration) section)

4. **Deploy the Application**:
   - Click the "Deploy" button
   - Vercel will automatically build and deploy your application

## License

This project is open-sourced under the AGPL-3.0 license. See the [LICENSE](LICENSE) file for details.
