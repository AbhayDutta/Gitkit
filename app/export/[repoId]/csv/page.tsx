import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { getRepoWithScores } from '@/lib/neon';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getRiskLabel(score: number): string {
  if (score >= 70) return 'Critical';
  if (score >= 40) return 'Warning';
  return 'Safe';
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildCSV(files: Awaited<ReturnType<typeof getRepoWithScores>>['files']) {
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

export default async function CSVExportPage({
  params,
}: {
  params: { repoId: string };
}) {
  const repoId = parseInt(params.repoId, 10);
  const { repo, files } = Number.isNaN(repoId)
    ? { repo: null, files: [] }
    : await getRepoWithScores(repoId);

  if (!repo) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Export unavailable</h1>
          <Link className="text-purple-300 hover:text-purple-200" href="/">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const csv = buildCSV(files);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href={`/dashboard/${repoId}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7 text-purple-400" />
              CSV Export
            </h1>
            <p className="text-gray-400 mt-1">
              {repo.owner}/{repo.repo_name} - {files.length} files
            </p>
          </div>
          <Link
            href={`/api/export/${repoId}?format=csv`}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            Open Raw CSV
          </Link>
        </div>

        <pre className="glass border border-purple-500/20 rounded-lg p-4 overflow-auto text-xs leading-relaxed whitespace-pre min-h-[65vh]">
          {csv}
        </pre>
      </div>
    </main>
  );
}
