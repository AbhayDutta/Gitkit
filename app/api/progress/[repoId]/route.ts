import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisProgress } from '@/lib/neon';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const repoId = parseInt(params.repoId, 10);
  if (isNaN(repoId)) {
    return NextResponse.json(
      { error: 'Invalid repository ID' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const progress = await getAnalysisProgress(repoId);

  if (!progress) {
    return NextResponse.json(
      {
        step: 'Initializing...',
        progress: 0,
        updatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders }
    );
  }

  return NextResponse.json(
    {
      step: progress.step,
      progress: progress.progress,
      updatedAt: progress.updated_at,
    },
    { headers: noStoreHeaders }
  );
}
