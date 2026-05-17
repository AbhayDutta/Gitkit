'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import type { ExportFile, ExportMeta } from '@/lib/export';

interface ExportButtonsProps {
  repoId: number;
  files: ExportFile[];
  meta: ExportMeta;
}

export default function ExportButtons({ repoId, files }: ExportButtonsProps) {
  const disabled = files.length === 0;
  const exportAction = `/api/export/${repoId}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={exportAction} method="GET">
        <input type="hidden" name="format" value="csv" />
        <button
          type="submit"
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 text-sm glass border border-purple-500/30 rounded-lg hover:border-purple-400/50 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          Export CSV
        </button>
      </form>
      <form action={exportAction} method="GET">
        <input type="hidden" name="format" value="pdf" />
        <button
          type="submit"
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-gray-300 hover:from-purple-500 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg shadow-purple-500/20"
        >
          <FileText className="w-4 h-4" />
          Export PDF
        </button>
      </form>
    </div>
  );
}
