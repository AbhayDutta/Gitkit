export interface ExportFile {
  path: string;
  riskScore: number;
  reasons: string[];
  analyzedAt?: string;
}

export interface ExportMeta {
  repoName: string;
  owner: string;
  analyzedAt: string;
  stats: {
    totalFiles: number;
    avgRiskScore: number;
    highRiskFiles: number;
  };
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'Critical';
  if (score >= 40) return 'Warning';
  return 'Safe';
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'gitkit-report';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

export function exportToCSV(files: ExportFile[], repoName: string): void {
  const headers = ['File Path', 'Risk Score', 'Risk Level', 'Reasons', 'Analyzed At'];
  const rows = files.map((f) => [
    f.path,
    f.riskScore.toString(),
    getRiskLabel(f.riskScore),
    f.reasons.join('; '),
    f.analyzedAt
      ? new Date(f.analyzedAt).toISOString()
      : new Date().toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${safeFileName(repoName)}-gitkit-report.csv`);
}

export async function exportToPDF(
  files: ExportFile[],
  meta: ExportMeta
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const sorted = [...files].sort((a, b) => b.riskScore - a.riskScore);
  let y = 20;

  doc.setFontSize(22);
  doc.setTextColor(168, 85, 247);
  doc.text('GitKit', 14, y);

  y += 12;
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(`${meta.owner}/${meta.repoName}`, 14, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Analysis Date: ${new Date(meta.analyzedAt).toLocaleString()}`,
    14,
    y
  );

  y += 12;
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(`Total Files: ${meta.stats.totalFiles}`, 14, y);
  doc.text(`Average Risk: ${meta.stats.avgRiskScore}`, 80, y);
  doc.text(`Critical Files: ${meta.stats.highRiskFiles}`, 140, y);

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

    const level = getRiskLabel(file.riskScore);
    const path =
      file.path.length > 55 ? `...${file.path.slice(-52)}` : file.path;

    doc.setTextColor(60, 60, 60);
    doc.text(path, 14, y);
    doc.text(String(file.riskScore), 130, y);

    if (level === 'Critical') doc.setTextColor(220, 38, 38);
    else if (level === 'Warning') doc.setTextColor(202, 138, 4);
    else doc.setTextColor(22, 163, 74);

    doc.text(level, 150, y);
    y += 6;
  });

  const blob = doc.output('blob');
  downloadBlob(blob, `${safeFileName(meta.repoName)}-gitkit-report.pdf`);
}
