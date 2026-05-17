/**
 * GET /api/scores/[repoId]
 * Fetches stored analysis results for a repository
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRepoWithScores,
  getRepoStats,
  getRepoAnalysisHistory,
} from '@/lib/neon';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    const repoId = parseInt(params.repoId, 10);

    if (isNaN(repoId)) {
      return NextResponse.json(
        { error: 'Invalid repository ID' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Fetch repository and file scores
    const { repo, files } = await getRepoWithScores(repoId);

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Get statistics
    const stats = await getRepoStats(repoId);
    const history = await getRepoAnalysisHistory(repo.github_url);

    return NextResponse.json(
      {
        repo: {
          id: repo.id,
          githubUrl: repo.github_url,
          owner: repo.owner,
          repoName: repo.repo_name,
          analyzedAt: repo.analyzed_at,
        },
        stats,
        history: history.map((h) => ({
          repoId: h.repoId,
          analyzedAt: h.analyzedAt,
          avgRiskScore: h.avgRiskScore,
          criticalCount: h.criticalCount,
          totalFiles: h.totalFiles,
        })),
        files: files.map((file) => ({
          id: file.id,
          path: file.file_path,
          riskScore: file.risk_score,
          reasons: file.reasons,
          commitChurn: file.commit_churn,
          hasTest: file.has_test,
          analyzedAt: file.analyzed_at,
        })),
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Error fetching scores:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch repository scores',
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

// Enable CORS for this route
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Made with Bob
