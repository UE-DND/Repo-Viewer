import axios from 'axios';

import { GITHUB_API_BASE, GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../Config';
import { shouldUseServerAPI } from '../../config';
import { getAuthHeaders } from '../Auth';

export interface GitTreeItem {
  path?: string;
  type?: string;
  size?: number;
  url?: string;
  sha?: string;
}

async function fetchTreeViaServerApi(branch: string): Promise<GitTreeItem[] | null> {
  const query = new URLSearchParams({
    action: 'getTree',
    branch,
    recursive: '1'
  });
  const response = await axios.get(`/api/github?${query.toString()}`);
  const data = response.data as { tree?: GitTreeItem[] };
  return Array.isArray(data.tree) ? data.tree : null;
}

async function fetchTreeDirectly(branch: string): Promise<GitTreeItem[] | null> {
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status.toString()}: ${response.statusText}`);
  }

  const data = (await response.json()) as { tree?: GitTreeItem[] };
  return Array.isArray(data.tree) ? data.tree : null;
}

export async function getBranchTree(branch: string): Promise<GitTreeItem[] | null> {
  if (shouldUseServerAPI()) {
    return fetchTreeViaServerApi(branch);
  }

  return fetchTreeDirectly(branch);
}

