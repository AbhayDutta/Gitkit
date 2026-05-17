'use client';

import FileRiskCard from './FileRiskCard';

interface FileScore {
  id: number;
  path: string;
  riskScore: number;
  reasons: string[];
  commitChurn: number;
  hasTest: boolean;
}

interface RiskHeatmapProps {
  files: FileScore[];
  isLoading?: boolean;
}

export default function RiskHeatmap({ files, isLoading = false }: RiskHeatmapProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-lg bg-gray-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
          <span className="text-3xl">📁</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          No Files Found
        </h3>
        <p className="text-gray-400">
          This repository doesn't have any analyzable files.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      {files.map((file, index) => (
        <FileRiskCard
          key={file.id}
          path={file.path}
          riskScore={file.riskScore}
          reasons={file.reasons}
          commitChurn={file.commitChurn}
          hasTest={file.hasTest}
          index={index}
        />
      ))}
    </div>
  );
}

// Made with Bob
