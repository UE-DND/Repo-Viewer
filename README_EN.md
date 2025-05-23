# Repo-Viewer

A GitHub repository browsing web application based on the MD3 design language.

[中文](README.md) | English

## Table of Contents

- [Key Features](#key-features)
- [Local Development](#local-development)
  - [Local Environment Variables](#local-environment-variables)
- [Deployment Guide](#deployment-guide)
  - [Vercel Deployment](#vercel-deployment)
    - [Vercel Environment Variables](#vercel-environment-variables)
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
> In production (e.g. Vercel), ONLY the following variables do NOT require the VITE_ prefix. All other variables that need to be read by the frontend MUST have the VITE_ prefix:
> - GITHUB_REPO_OWNER
> - GITHUB_REPO_NAME
> - GITHUB_REPO_BRANCH
> - GITHUB_PAT1
> - OFFICE_PREVIEW_PROXY

**Required Environment Variables**:
```
# Basic Configuration (all frontend variables must use VITE_ prefix except repo info)
VITE_SITE_TITLE = Your Site Title
VITE_HOMEPAGE_FILTER_ENABLED = true
VITE_HOMEPAGE_ALLOWED_FOLDERS = docs,src
VITE_HOMEPAGE_ALLOWED_FILETYPES = md,pdf,txt
VITE_HIDE_MAIN_FOLDER_DOWNLOAD = false
VITE_HIDE_DOWNLOAD_FOLDERS = node_modules,dist
VITE_IMAGE_PROXY_URL = https://your-proxy
VITE_DEVELOPER_MODE = false

# Repository info (in production, these can be without VITE_ prefix for backend use)
GITHUB_REPO_OWNER = Repository Owner
GITHUB_REPO_NAME = Repository Name
GITHUB_REPO_BRANCH = Branch Name (defaults to main)
GITHUB_PAT1 = Your GitHub Personal Access Token
OFFICE_PREVIEW_PROXY = Worker URL
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
   - Add the necessary environment variables (see [Vercel Environment Variables](#vercel-environment-variables) below)

4. **Deploy the Application**:
   - Click the "Deploy" button
   - Vercel will automatically build and deploy your application

#### Vercel Environment Variables

**Required Environment Variables**:
```
# Basic Configuration
SITE_TITLE = Your Site Title
GITHUB_REPO_OWNER = Repository Owner
GITHUB_REPO_NAME = Repository Name
GITHUB_REPO_BRANCH = Branch Name (defaults to main)

# GitHub Tokens (at least one required)
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
     * Example: `example.com/proxy/**` matches `example.com/proxy/folder/file`

6. **Test Document Preview**:
   - After deployment, open the application
   - Try to preview an Office document (e.g., .docx, .xlsx, or .pptx)
   - The system will automatically use the Worker proxy to preview the document

## Troubleshooting

Encountering issues? Here are common problems and solutions:

### API Access Issues

If you encounter GitHub API access issues:

1. Confirm your environment variables are correctly set
2. Check if PATs have the necessary permissions (`repo` for private repositories, `public_repo` for public repositories)
3. Verify PATs have not expired
4. Check Vercel function logs for detailed error information
5. If developer mode is enabled, check the console for detailed logs

### Office Document Preview Issues

If Office document preview is not working:

1. Confirm that the Cloudflare Worker is correctly deployed
2. Check if the `OFFICE_PREVIEW_PROXY` environment variable is correctly set
3. Look for error messages in the browser console
4. Check Worker logs in the Cloudflare Workers dashboard
5. If using a custom domain, ensure DNS is properly configured and SSL certificate is active
6. If using wildcard routes, verify that your route rules correctly match the request URLs

### Content Filtering Issues

If content filtering doesn't work as expected:

1. Confirm that `HOMEPAGE_FILTER_ENABLED` is set to `true`
2. Check if `HOMEPAGE_ALLOWED_FOLDERS` and `HOMEPAGE_ALLOWED_FILETYPES` are configured correctly
3. Ensure folder names and file type names match the actual repository content
4. For more questions, enable developer mode to view detailed logs

## Tech Stack

- React, TypeScript, Vite
- Material UI component library
- Vercel Serverless Functions
- Cloudflare Workers (for Office document preview proxy)

## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details. 