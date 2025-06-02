# Repo-Viewer

A GitHub repository browsing web application based on the MD3 design language.

English | [中文](README_ZH.md)

## Table of Contents

- [Key Features](#key-features)
- [Local Development](#local-development)
  - [Local Environment Variables](#local-environment-variables)
- [Deployment Guide](#deployment-guide)
  - [Vercel Deployment](#vercel-deployment)
    - [Vercel Environment Variables Configuration](#vercel-environment-variables-configuration)
  - [Cloudflare Worker Configuration](#cloudflare-worker-configuration)
- [Troubleshooting](#troubleshooting)
- [Tech Stack](#tech-stack)
- [License](#license)

## Key Features

- 🔍 **Repository Browsing**: Intuitive file structure navigation
- 📄 **File Preview**: Support for previewing multiple file formats including Markdown, PDF, and images
- ⬇️ **File Download**: Download individual files or entire folders
- 🔄 **Responsive Design**: Compatible with desktop and mobile devices
- 🔍 **Content Filtering**: Support for filtering files and folders on the homepage
- 🛠️ **Developer Mode**: Provides detailed debugging information and performance statistics
- 🌐 **SEO Optimization**: Dynamic meta tags to improve search engine visibility and social sharing

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

> ⚠️ **Important**: For local development, you **must** use variables with the VITE_ prefix, otherwise the frontend cannot read the environment variables!  
> In production (e.g. Vercel), only the following variables do **not** need the VITE_ prefix. All other variables that need to be read by the frontend **must** have the VITE_ prefix:
> - GITHUB_PAT1
> - OFFICE_PREVIEW_PROXY

**Required Environment Variables**:
```
# Basic Configuration
VITE_SITE_TITLE = Your Site Title
VITE_SITE_DESCRIPTION = Your site description for SEO
VITE_SITE_KEYWORDS = keyword1, keyword2, keyword3
VITE_SITE_OG_IMAGE = /repo-viewer-icon.svg
VITE_SITE_TWITTER_HANDLE = @yourTwitterHandle
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
VITE_OFFICE_PREVIEW_PROXY = Worker URL
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
VITE_SITE_OG_IMAGE = /repo-viewer-icon.svg
VITE_SITE_TWITTER_HANDLE = @yourTwitterHandle
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
OFFICE_PREVIEW_PROXY = Worker URL
```

**Optional Environment Variables**:
```
# SEO Settings (optional)
SITE_TWITTER_HANDLE = @yourTwitterHandle

# Homepage Content Filtering (optional) - Only affects the repository root directory (homepage)
HOMEPAGE_FILTER_ENABLED = true or false           # Enable homepage filtering
HOMEPAGE_ALLOWED_FOLDERS = folder1,folder2        # Folders allowed to be displayed on homepage
HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt           # File types allowed to be displayed on homepage

# Homepage Download Button Control (optional) - Only affects the repository root directory (homepage)
HIDE_MAIN_FOLDER_DOWNLOAD = true or false         # Hide download button for the main folder on homepage
HIDE_DOWNLOAD_FOLDERS = folder1,folder2           # Folders on homepage to hide download button for

# Proxy Settings (optional)
IMAGE_PROXY_URL = Image Proxy URL                 # Image proxy URL

# Office Document Preview (optional)
OFFICE_PREVIEW_PROXY = Worker URL                 # Worker proxy URL

# Developer Options (optional)
DEVELOPER_MODE = true or false                    # Enable developer mode
```

### Cloudflare Worker Configuration

If you need to support online preview of Office documents, you can configure a Cloudflare Worker as a proxy service:

#### Worker Deployment Steps

1. **Create a Cloudflare Account**:
   - Visit the [Cloudflare website](https://www.cloudflare.com/) and register an account

2. **Deploy the Worker**:
   - Log in to the Cloudflare dashboard
   - Navigate to "Workers & Pages"
   - Click "Create Worker"
   - Copy the content of the `worker.js` file from the project root directory into the Worker editor
   - Click "Save and Deploy" to deploy the Worker
   - Note down the Worker URL (e.g., `https://your-worker.your-account.workers.dev`)

3. **Configure the Application to Use the Worker**:
   - Add to Vercel environment variables:
   ```
   OFFICE_PREVIEW_PROXY = {Your Worker URL}
   ```
   - Or add to your local development `.env` file:
   ```
   VITE_OFFICE_PREVIEW_PROXY = {Your Worker URL}
   ```

4. **Bind Custom Domain (Optional but Recommended)**:
   - In the Cloudflare dashboard, go to "Workers & Pages"
   - Select your Worker
   - Click the "Triggers" tab
   - In the "Custom Domains" section, click "Add Custom Domain"
   - Enter a domain you own (e.g., `worker.example.com`)
   - Ensure this domain is already managed in Cloudflare DNS
   - Click "Add Custom Domain" to complete the setup

5. **Configure Routes (Wildcard Routing)**:
   - In the Cloudflare dashboard, go to "Workers & Pages"
   - Select your Worker
   - Click the "Triggers" tab
   - In the "Routes" section, click "Add Route"
   - Add routing rules, for example:
     * Exact path: `example.com/proxy/*` (matches all requests under the specified path)
     * Subdomain: `worker.example.com/*` (matches all requests under the subdomain)
     * Wildcard domain: `*.example.com/proxy/*` (matches specified path on all subdomains)
   - Important notes:
     * Single wildcard (`*`) matches a single path segment and doesn't cross slashes
     * Double wildcard (`**`) matches multiple path segments and can cross slashes
     * Example: `example.com/proxy/*` only matches `example.com/proxy/file`, not `example.com/proxy/folder/file`

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
- Cloudflare Workers (for Office document preview proxy)
- SEO optimization with dynamic meta tags

## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details. 