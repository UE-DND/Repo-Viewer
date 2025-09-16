# Repo-Viewer

A GitHub repository browsing web application based on the MD3 design language.

English | [中文](README_ZH.md)

## Table of Contents

- [Repo-Viewer](#repo-viewer)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Local Development](#local-development)
    - [Local Environment Variables](#local-environment-variables)
  - [Deployment Guide](#deployment-guide)
    - [Vercel Deployment](#vercel-deployment)
      - [Secure Deployment Method](#secure-deployment-method)
      - [Deployment Steps](#deployment-steps)
      - [Vercel Environment Variables Configuration](#vercel-environment-variables-configuration)
  - [Troubleshooting](#troubleshooting)
    - [API Rate Limiting Issues](#api-rate-limiting-issues)
    - [Deployment Issues](#deployment-issues)
    - [Content Filtering Issues](#content-filtering-issues)
  - [Tech Stack](#tech-stack)
  - [License](#license)

## Key Features

- 🔍 **Repository Browsing**: Intuitive file structure navigation
- 📄 **File Preview**: Support for previewing multiple file formats including Markdown, PDF, and images
- ⬇️ **File Download**: Download individual files or entire folders
- 🔄 **Responsive Design**: Compatible with desktop and mobile devices
- 🔍 **Content Filtering**: Support for filtering files and folders on the homepage
- 🛠️ **Developer Mode**: Provides detailed debugging information and performance statistics
- 🌐 **SEO Optimization**: Improve search engine visibility

## Local Development

Want to develop and debug this project in your local environment? Follow these steps to set up your development environment:

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
   - **Note**: `env.local.txt` is only a template for local development, and the variable name format (with `VITE_` prefix) is only for local development environment

4. **Start the Development Server**

   ```bash
   npm run dev
   ```

   - The development server will start at `http://localhost:3000`

### Local Environment Variables

> ⚠️ **Important**: For local development, you **must** use variables with the VITE_prefix, otherwise the frontend cannot read the environment variables!  
> In production (e.g. Vercel), only the following variables do **not** need the VITE_ prefix. All other variables that need to be read by the frontend **must** have the VITE_ prefix:
>
> - GITHUB_PAT1
> - OFFICE_PREVIEW_PROXY

**Required Environment Variables**:

```
# Basic Configuration
VITE_SITE_TITLE = Your Site Title
VITE_SITE_DESCRIPTION = Your site description for SEO
VITE_SITE_KEYWORDS = keyword1, keyword2, keyword3
VITE_SITE_OG_IMAGE = /icon.svg
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false
VITE_GITHUB_REPO_OWNER = Repository Owner
VITE_GITHUB_REPO_NAME = Repository Name
VITE_GITHUB_REPO_BRANCH = Branch Name (defaults to main)

# Repository Information
VITE_GITHUB_PAT1 = Your GitHub Personal Access Token
```

## Deployment Guide

### Vercel Deployment

#### Secure Deployment Method

When deploying on Vercel, GitHub Personal Access Tokens (PATs) are protected through:

1. Tokens are stored as Vercel environment variables without the `VITE_` prefix, so they won't be bundled with frontend code
2. All requests requiring GitHub authentication are handled through server-side API endpoints
3. Multiple PAT rotation is supported, automatically switching when token quotas are exhausted or expired

#### Deployment Steps

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
   - Add the necessary environment variables (see [Vercel Environment Variables Configuration](#vercel-environment-variables-configuration) below)

4. **Deploy the Application**:
   - Click the "Deploy" button
   - Vercel will automatically build and deploy your application

#### Vercel Environment Variables Configuration

**Required Environment Variables**:

```
# Basic Configuration
VITE_SITE_TITLE = Your Site Title
VITE_SITE_DESCRIPTION = Your site description for SEO
VITE_SITE_KEYWORDS = keyword1, keyword2, keyword3
VITE_SITE_OG_IMAGE = /icon.svg
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# Repository Information
GITHUB_REPO_OWNER = Repository Owner
GITHUB_REPO_NAME = Repository Name
GITHUB_REPO_BRANCH = Branch Name (defaults to main)
GITHUB_PAT1 = Your GitHub Personal Access Token
```

**Optional Environment Variables**:

```
# Homepage Content Filtering (optional) - Only affects the repository root directory (homepage)
HOMEPAGE_FILTER_ENABLED = true or false           # Enable homepage filtering
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2        # Folders allowed to be displayed on homepage
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt           # File types allowed to be displayed on homepage

# Homepage Download Button Control (optional) - Only affects the repository root directory (homepage)
HIDE_MAIN_FOLDER_DOWNLOAD = true or false         # Hide download button for the main folder on homepage
HIDE_DOWNLOAD_FOLDERS = folder1,folder2           # Folders on homepage to hide download button for

# Proxy Settings (optional)
IMAGE_PROXY_URL = Image Proxy URL                 # Image proxy URL


# Developer Options (optional)
DEVELOPER_MODE = true or false                    # Enable developer mode
```

## Troubleshooting

If you encounter issues during deployment or usage:

### API Rate Limiting Issues

1. Ensure you have correctly configured GitHub Personal Access Tokens
2. Check if your tokens have the correct permissions (`repo` scope)
3. For high-traffic sites, consider adding multiple PATs for rotation
4. Verify token usage in GitHub developer settings

### Deployment Issues

1. Check if all required environment variables are set correctly
2. Ensure your repository has necessary permissions for Vercel
3. Check Vercel build logs for any specific error messages
4. Verify your GitHub tokens have not expired
5. If using a custom domain, ensure DNS is configured correctly and SSL certificate is active
6. If using wildcard routes, verify that your route rules correctly match the request URLs

### Content Filtering Issues

If content filtering doesn't work as expected:

1. Confirm that `HOMEPAGE_FILTER_ENABLED` is set to `true`
2. Check if `HOMEPAGE_ALLOWED_FOLDERS` and `HOMEPAGE_ALLOWED_FILETYPES` are configured correctly
3. Ensure folder names and file type names match the actual repository content
4. For more troubleshooting, enable developer mode to view detailed logs

## Tech Stack

- React, TypeScript, Vite
- Material UI component library
- Vercel Serverless Functions
- SEO optimization with dynamic meta tags

## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.
