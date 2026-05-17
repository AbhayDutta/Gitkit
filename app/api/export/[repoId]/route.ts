import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { getRepoStats, getRepoWithScores } from '@/lib/neon';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getRiskLabel(score: number): string {
  if (score >= 70) return 'Critical';
  if (score >= 40) return 'Warning';
  return 'Safe';
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'gitkit-report'
  );
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildCSV(
  files: Awaited<ReturnType<typeof getRepoWithScores>>['files']
): string {
  const headers = [
    'File Path',
    'Risk Score',
    'Risk Level',
    'Reasons',
    'Commit Churn',
    'Has Test',
    'Analyzed At',
  ];
  const rows = files.map((file) => [
    file.file_path,
    file.risk_score,
    getRiskLabel(file.risk_score),
    file.reasons.join('; '),
    file.commit_churn,
    file.has_test ? 'Yes' : 'No',
    new Date(file.analyzed_at).toISOString(),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

function buildPDF(
  repo: NonNullable<Awaited<ReturnType<typeof getRepoWithScores>>['repo']>,
  files: Awaited<ReturnType<typeof getRepoWithScores>>['files'],
  stats: Awaited<ReturnType<typeof getRepoStats>>
): ArrayBuffer {
  const doc = new jsPDF();
  const sorted = [...files].sort((a, b) => b.risk_score - a.risk_score);
  let y = 20;

  doc.setFontSize(22);
  doc.setTextColor(168, 85, 247);
  doc.text('GitKit Risk Report', 14, y);

  y += 12;
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(`${repo.owner}/${repo.repo_name}`, 14, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Analysis Date: ${new Date(repo.analyzed_at).toLocaleString()}`, 14, y);

  y += 12;
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(`Total Files: ${stats.totalFiles}`, 14, y);
  doc.text(`Average Risk: ${stats.avgRiskScore}`, 80, y);
  doc.text(`Critical Files: ${stats.highRiskFiles}`, 140, y);

  y += 14;
  doc.setDrawColor(168, 85, 247);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(168, 85, 247);
  doc.text('File Path', 14, y);
  doc.text('Score', 130, y);
  doc.text('Level', 150, y);
  y += 6;

  doc.setFontSize(8);
  sorted.forEach((file) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const level = getRiskLabel(file.risk_score);
    const path =
      file.file_path.length > 55
        ? `...${file.file_path.slice(-52)}`
        : file.file_path;

    doc.setTextColor(60, 60, 60);
    doc.text(path, 14, y);
    doc.text(String(file.risk_score), 130, y);

    if (level === 'Critical') doc.setTextColor(220, 38, 38);
    else if (level === 'Warning') doc.setTextColor(202, 138, 4);
    else doc.setTextColor(22, 163, 74);

    doc.text(level, 150, y);
    y += 6;
  });

  return doc.output('arraybuffer');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    const repoId = parseInt(params.repoId, 10);
    if (Number.isNaN(repoId)) {
      return NextResponse.json({ error: 'Invalid repository ID' }, { status: 400 });
    }

    const format = request.nextUrl.searchParams.get('format') || 'csv';
    if (format !== 'csv' && format !== 'pdf') {
      return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
    }

    const [{ repo, files }, stats] = await Promise.all([
      getRepoWithScores(repoId),
      getRepoStats(repoId),
    ]);

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const fileBase = `${safeFileName(repo.repo_name)}-gitkit-report`;

    if (format === 'pdf') {
      return new NextResponse(buildPDF(repo, files, stats), {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': `inline; filename="${fileBase}.pdf"`,
          'Content-Type': 'application/pdf',
        },
      });
    }

    return new NextResponse(buildCSV(files), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="${fileBase}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export report' },
      { status: 500 }
    );
  }
}
