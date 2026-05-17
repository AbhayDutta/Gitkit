/**
 * POST /api/analyze — starts analysis and returns repoId for progress polling
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import {
  parseGitHubUrl,
  fetchRepoFiles,
  calculateCommitChurn,
  hasTestFile,
  getFileExtension,
} from '@/lib/github';
import { scoreFilesOptimized } from '@/lib/scorer';
import {
  initializeDatabase,
  insertRepo,
  insertFileScores,
  upsertAnalysisProgress,
  saveProject,
} from '@/lib/neon';

export const maxDuration = 300;

const lastProgressUpdateByRepo = new Map<number, number>();
const CHURN_TIMEOUT_MS = Number(process.env.CHURN_TIMEOUT_MS || 6000);

async function updateProgress(
  repoId: number,
  step: string,
  progress: number,
  force = false
) {
  const now = Date.now();
  const lastProgressUpdate = lastProgressUpdateByRepo.get(repoId) || 0;
  if (!force && now - lastProgressUpdate < 1500 && progress < 100) return;
  lastProgressUpdateByRepo.set(repoId, now);
  await upsertAnalysisProgress(repoId, step, progress);
}

async function withFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeout = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

async function runAnalysis(
  repoId: number,
  owner: string,
  repo: string,
  githubToken?: string
) {
  lastProgressUpdateByRepo.delete(repoId);

  try {
    await updateProgress(
      repoId,
      'Fetching repository structure...',
      10,
      true
    );

    const files = await fetchRepoFiles(
      owner,
      repo,
      githubToken,
      (found, target) => {
        const pct = 10 + Math.min(8, Math.round((found / target) * 8));
        void updateProgress(
          repoId,
          `Scanning repository files... (${found}/${target})`,
          pct
        );
      }
    );

    if (files.length === 0) {
      await updateProgress(repoId, 'No files found', 0, true);
      return;
    }

    await updateProgress(
      repoId,
      `Fetching recent activity for ${files.length} files...`,
      18,
      true
    );

    const churnMap = await withFallback(
      calculateCommitChurn(
        owner,
        repo,
        githubToken,
        files.map((file) => file.path)
      ),
      CHURN_TIMEOUT_MS,
      new Map<string, number>()
    );

    const analyses = files.map((file) => ({
      filePath: file.path,
      commitChurn: churnMap.get(file.path) || 0,
      hasTest: hasTestFile(file.path, files),
      fileExtension: getFileExtension(file.path),
    }));

    await updateProgress(repoId, 'Scoring with IBM Granite AI...', 30, true);

    const scores = await scoreFilesOptimized(analyses, (completed, total) => {
      const pct = 30 + Math.round((completed / total) * 58);
      void updateProgress(
        repoId,
        `Scoring with IBM Granite AI... (${completed}/${total})`,
        pct
      );
    });

    const fileScores = files.map((file, i) => ({
      filePath: file.path,
      riskScore: scores[i].riskScore,
      reasons: scores[i].reasons,
      commitChurn: analyses[i].commitChurn,
      hasTest: analyses[i].hasTest,
    }));

    fileScores.sort((a, b) => b.riskScore - a.riskScore);

    await updateProgress(repoId, 'Saving to database...', 92, true);
    await insertFileScores(repoId, fileScores);
    await updateProgress(
      repoId,
      'Done! Redirecting to dashboard...',
      100,
      true
    );
  } catch (error) {
    console.error('Background analysis failed:', error);
    await updateProgress(
      repoId,
      error instanceof Error ? error.message : 'Analysis failed',
      0,
      true
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format' },
        { status: 400 }
      );
    }

    const { owner, repo } = repoInfo;
    const githubToken = process.env.GITHUB_TOKEN;

    await initializeDatabase();
    const repoId = await insertRepo(repoUrl, owner, repo);
    await upsertAnalysisProgress(
      repoId,
      'Fetching repository structure...',
      5
    );

    const session = await getServerSession(authOptions);
    if (session?.user && (session.user as any).id) {
      await saveProject((session.user as any).id, repoId);
    }

    void runAnalysis(repoId, owner, repo, githubToken);

    return NextResponse.json(
      { repoId, owner, repo, status: 'started' },
      { status: 202 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to start analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
