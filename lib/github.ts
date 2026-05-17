/**
 * GitHub API Helper Functions
 * Fetches repository data using GitHub REST API
 */

import { mapWithConcurrency } from './concurrency';

const MAX_REPO_FILES = Number(process.env.MAX_REPO_FILES || 80);
const MAX_TREE_DIRECTORIES = Number(process.env.MAX_TREE_DIRECTORIES || 60);
const MAX_TREE_DEPTH = Number(process.env.MAX_TREE_DEPTH || 4);
const COMMIT_PAGE_SIZE = Number(process.env.COMMIT_PAGE_SIZE || 8);
const COMMIT_FETCH_CONCURRENCY = Number(process.env.COMMIT_FETCH_CONCURRENCY || 6);
const GITHUB_FETCH_TIMEOUT_MS = Number(process.env.GITHUB_FETCH_TIMEOUT_MS || 8000);

const IGNORED_PATH_PARTS = new Set([
  '.git',
  '.github',
  '.next',
  'coverage',
  'dist',
  'build',
  'node_modules',
  'out',
  'vendor',
]);

const SCORABLE_EXTENSIONS = new Set([
  '.c',
  '.cpp',
  '.cs',
  '.css',
  '.go',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.php',
  '.py',
  '.rb',
  '.rs',
  '.sql',
  '.swift',
  '.ts',
  '.tsx',
]);

export interface GitHubFile {
  path: string;
  type: string;
  sha: string;
  size: number;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export interface RepoInfo {
  owner: string;
  repo: string;
}

interface GitHubRepoMetadata {
  default_branch: string;
}

interface GitHubBranch {
  commit: {
    commit?: {
      tree?: {
        sha: string;
      };
    };
  };
}

interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
}

function createGitHubHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchGitHubJson<T>(
  url: string,
  token?: string,
  timeoutMs = GITHUB_FETCH_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: createGitHubHeaders(token),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        error?.message || `GitHub API error: ${response.status}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldAnalyzeFile(file: GitHubFile): boolean {
  if (file.type !== 'blob') return false;
  if (file.size > 500_000) return false;

  const parts = file.path.toLowerCase().split('/');
  if (parts.some((part) => IGNORED_PATH_PARTS.has(part))) return false;

  return SCORABLE_EXTENSIONS.has(getFileExtension(file.path));
}

function shouldSkipPath(path: string): boolean {
  return path
    .toLowerCase()
    .split('/')
    .some((part) => IGNORED_PATH_PARTS.has(part));
}

function filePriority(file: GitHubFile): number {
  const lowerPath = file.path.toLowerCase();
  let score = 0;

  if (lowerPath.includes('/api/') || lowerPath.includes('/lib/')) score += 20;
  if (lowerPath.includes('/utils/') || lowerPath.includes('/core/')) score += 15;
  if (lowerPath.includes('database') || lowerPath.includes('schema')) score += 12;
  if (lowerPath.includes('config') || lowerPath.includes('auth')) score += 10;
  if (/\.(ts|tsx|js|jsx|py|java|kt|go|rs)$/.test(lowerPath)) score += 8;

  return score;
}

function directoryPriority(path: string): number {
  const lowerPath = path.toLowerCase();
  let score = 0;

  if (lowerPath.includes('src')) score += 25;
  if (lowerPath.includes('app') || lowerPath.includes('pages')) score += 22;
  if (lowerPath.includes('api') || lowerPath.includes('server')) score += 20;
  if (lowerPath.includes('lib') || lowerPath.includes('core')) score += 18;
  if (lowerPath.includes('components')) score += 14;
  if (lowerPath.includes('packages')) score += 10;
  if (lowerPath.includes('test') || lowerPath.includes('__tests__')) score -= 8;

  return score - path.split('/').length;
}

function toGitHubFile(item: GitHubTreeItem, path: string): GitHubFile {
  return {
    path,
    type: item.type,
    sha: item.sha,
    size: item.size || 0,
    url: item.url,
  };
}

/**
 * Parse GitHub URL to extract owner and repo name
 */
export function parseGitHubUrl(url: string): RepoInfo | null {
  try {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', ''),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    return null;
  }
}

/**
 * Fetch repository file tree from GitHub API
 */
export async function fetchRepoFiles(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (found: number, target: number) => void
): Promise<GitHubFile[]> {
  try {
    const metadata = await fetchGitHubJson<GitHubRepoMetadata>(
      `https://api.github.com/repos/${owner}/${repo}`,
      token
    );

    const branch = await fetchGitHubJson<GitHubBranch>(
      `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(metadata.default_branch)}`,
      token
    );

    const rootTreeSha = branch.commit.commit?.tree?.sha;
    if (!rootTreeSha) {
      throw new Error('Could not resolve repository root tree');
    }

    onProgress?.(0, MAX_REPO_FILES);

    const data = await fetchGitHubJson<GitHubTreeResponse>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${rootTreeSha}?recursive=1`,
      token
    );

    const files: GitHubFile[] = [];
    for (const item of data.tree) {
      if (shouldSkipPath(item.path)) continue;

      if (item.type === 'blob') {
        const file = toGitHubFile(item, item.path);
        if (shouldAnalyzeFile(file)) {
          files.push(file);
        }
      }
    }

    onProgress?.(Math.min(files.length, MAX_REPO_FILES), MAX_REPO_FILES);

    return files
      .sort((a, b) => filePriority(b) - filePriority(a))
      .slice(0, MAX_REPO_FILES);
  } catch (error) {
    console.error('Error fetching repo files:', error);
    throw error;
  }
}

/**
 * Fetch recent commits from GitHub API
 */
export async function fetchRepoCommits(
  owner: string,
  repo: string,
  token?: string,
  perPage: number = COMMIT_PAGE_SIZE
): Promise<GitHubCommit[]> {
  try {
    return await fetchGitHubJson<GitHubCommit[]>(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`,
      token
    );
  } catch (error) {
    console.error('Error fetching repo commits:', error);
    throw error;
  }
}

/**
 * Fetch detailed commit information including file changes
 */
export async function fetchCommitDetails(
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<GitHubCommit> {
  try {
    return await fetchGitHubJson<GitHubCommit>(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      token
    );
  } catch (error) {
    console.error('Error fetching commit details:', error);
    throw error;
  }
}

/**
 * Calculate commit churn for each file
 * Returns a map of file paths to their commit count
 */
export async function calculateCommitChurn(
  owner: string,
  repo: string,
  token?: string,
  relevantPaths?: string[]
): Promise<Map<string, number>> {
  const commits = await fetchRepoCommits(owner, repo, token);
  const churnMap = new Map<string, number>();
  const relevantPathSet = relevantPaths ? new Set(relevantPaths) : null;

  // Fetch commit details in parallel (was 1-by-1 — very slow)
  const partialMaps = await mapWithConcurrency(
    commits,
    COMMIT_FETCH_CONCURRENCY,
    async (commit) => {
      const partial = new Map<string, number>();
      try {
        const details = await fetchCommitDetails(
          owner,
          repo,
          commit.sha,
          token
        );
        if (details.files) {
          for (const file of details.files) {
            if (relevantPathSet && !relevantPathSet.has(file.filename)) {
              continue;
            }
            partial.set(file.filename, (partial.get(file.filename) || 0) + 1);
          }
        }
      } catch {
        console.warn(`Failed to fetch details for commit ${commit.sha}`);
      }
      return partial;
    }
  );

  for (const partial of partialMaps) {
    partial.forEach((count, path) => {
      churnMap.set(path, (churnMap.get(path) || 0) + count);
    });
  }

  return churnMap;
}

/**
 * Check if a test file exists for a given source file
 */
export function hasTestFile(
  filePath: string,
  allFiles: GitHubFile[]
): boolean {
  const pathWithoutExt = filePath.replace(/\.[^/.]+$/, '');
  const fileName = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
  
  // Common test file patterns
  const testPatterns = [
    `${pathWithoutExt}.test.`,
    `${pathWithoutExt}.spec.`,
    `${fileName}.test.`,
    `${fileName}.spec.`,
    `__tests__/${fileName}`,
    `tests/${fileName}`,
  ];

  return allFiles.some((file) =>
    testPatterns.some((pattern) => file.path.includes(pattern))
  );
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const match = filePath.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}

/**
 * Validate GitHub token
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: createGitHubHeaders(token),
      signal: controller.signal,
    });

    return response.ok;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Made with Bob
