import type { GitHubContent } from '@/types';

import { searchWithGitHubApi } from './githubApi';
import {
  searchFiles,
  searchMultipleBranchesWithTreesApi
} from './local';

export { searchWithGitHubApi, searchFiles, searchMultipleBranchesWithTreesApi };

export type SearchTreesResult = { branch: string; results: GitHubContent[] }[];

