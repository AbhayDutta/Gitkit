'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Code2, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnalysisProgress from './AnalysisProgress';

interface RepoConnectorProps {
  suggestedRepos?: string[];
}

function RepoConnectorInner({ suggestedRepos }: RepoConnectorProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [progressStep, setProgressStep] = useState('Initializing...');
  const [progressPercent, setProgressPercent] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (repoId: number) => {
      stopPolling();

      const poll = async () => {
        try {
          const res = await fetch(`/api/progress/${repoId}`, {
            cache: 'no-store',
          });
          const data = await res.json();
          if (res.ok) {
            setProgressStep(data.step);
            setProgressPercent(data.progress);
            if (
              data.progress <= 0 &&
              data.step &&
              data.step !== 'Initializing...'
            ) {
              setError(data.step);
              setIsAnalyzing(false);
              stopPolling();
              return;
            }
            if (data.progress >= 100) {
              stopPolling();
              setTimeout(() => router.push(`/dashboard/${repoId}`), 800);
            }
          }
        } catch {
          /* ignore */
        }
      };

      void poll();
      pollRef.current = setInterval(poll, 2000);
    },
    [router, stopPolling]
  );

  useEffect(() => {
    const reanalyze = searchParams.get('reanalyze');
    if (reanalyze) setRepoUrl(decodeURIComponent(reanalyze));
    return () => stopPolling();
  }, [searchParams, stopPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    stopPolling();

    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    if (!repoUrl.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);
    setProgressStep('Fetching repository structure...');
    setProgressPercent(0);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      if (data.repoId) {
        startPolling(data.repoId);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
      setIsAnalyzing(false);
      stopPolling();
    }
  };

  if (isAnalyzing) {
    return <AnalysisProgress step={progressStep} progress={progressPercent} />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Code2 className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className="w-full pl-12 pr-4 py-4 glass border-2 border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-purple-500 to-gray-300 hover:from-purple-500 hover:to-gray-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Analyze Repo</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 mb-3">{suggestedRepos ? 'Your Repositories:' : 'Try an example:'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {(suggestedRepos || [
            'https://github.com/vercel/next.js',
            'https://github.com/facebook/react',
            'https://github.com/microsoft/vscode',
          ]).map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setRepoUrl(url)}
              className="px-3 py-1 text-xs glass border border-gray-700/50 hover:border-purple-500/50 rounded-full text-gray-300 transition-all"
            >
              {url.split('/').slice(-2).join('/')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RepoConnector({ suggestedRepos }: RepoConnectorProps) {
  return (
    <Suspense
      fallback={
        <div className="h-32 max-w-2xl mx-auto animate-pulse glass rounded-xl" />
      }
    >
      <RepoConnectorInner suggestedRepos={suggestedRepos} />
    </Suspense>
  );
}
