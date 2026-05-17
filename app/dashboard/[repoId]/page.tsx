'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AnimatedBackground from '@/components/AnimatedBackground';
import RiskHeatmap from '@/components/RiskHeatmap';
import RiskChart from '@/components/RiskChart';

interface FileScore {
  id: number;
  path: string;
  riskScore: number;
  reasons: string[];
  commitChurn: number;
  hasTest: boolean;
  analyzedAt?: string;
}

interface HistoryPoint {
  repoId: number;
  analyzedAt: string;
  avgRiskScore: number;
  criticalCount: number;
  totalFiles: number;
}

interface RepoData {
  repo: {
    id: number;
    githubUrl: string;
    owner: string;
    repoName: string;
    analyzedAt: string;
  };
  stats: {
    totalFiles: number;
    highRiskFiles: number;
    mediumRiskFiles: number;
    lowRiskFiles: number;
    avgRiskScore: number;
    filesWithoutTests: number;
  };
  history?: HistoryPoint[];
  files: FileScore[];
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;

  const [data, setData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [repoId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/scores/${repoId}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch data');
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-200 mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Repository not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-gray-300 text-white rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const { repo, stats, files, history = [] } = data;
  return (
    <div className="min-h-screen animated-bg relative">
      <AnimatedBackground />
      <Navbar githubHref={repo.githubUrl} githubLabel="View on GitHub" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-purple-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">
              {repo.owner}/{repo.repoName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              Analyzed {new Date(repo.analyzedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/export/${repo.id}/csv`)}
              disabled={files.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm glass border border-purple-500/30 rounded-lg hover:border-purple-400/50 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-400" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => router.push(`/export/${repo.id}/pdf`)}
              disabled={files.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-gray-300 hover:from-purple-500 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg shadow-purple-500/20"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() =>
                router.push(`/?reanalyze=${encodeURIComponent(repo.githubUrl)}`)
              }
              className="flex items-center gap-2 px-4 py-2 glass border border-gray-700/50 rounded-lg hover:border-purple-500/50"
            >
              <RefreshCw className="w-4 h-4" />
              Re-analyze
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Files', value: stats.totalFiles, color: 'text-gray-100' },
            {
              label: 'Critical',
              value: stats.highRiskFiles,
              color: 'text-red-400',
              icon: AlertTriangle,
            },
            {
              label: 'Warning',
              value: stats.mediumRiskFiles,
              color: 'text-yellow-400',
              icon: TrendingUp,
            },
            {
              label: 'Safe',
              value: stats.lowRiskFiles,
              color: 'text-green-400',
              icon: CheckCircle,
            },
            { label: 'Avg Score', value: stats.avgRiskScore, color: 'text-purple-400' },
            { label: 'No Tests', value: stats.filesWithoutTests, color: 'text-gray-100' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="p-4 rounded-xl glass border border-purple-500/10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1 flex items-center gap-2`}>
                {stat.icon && <stat.icon className="w-4 h-4" />}
                {stat.value}
              </div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <RiskChart files={files} history={history} />

        <h2 className="text-2xl font-bold text-gray-100 mb-6">Risk Heatmap</h2>
        <RiskHeatmap files={files} />
      </div>
    </div>
  );
}
