'use client';

import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalysisProgressProps {
  step: string;
  progress: number;
}

const STEPS = [
  'Fetching repository structure...',
  'Analyzing',
  'Scoring with IBM Granite AI...',
  'Saving to database...',
  'Done! Redirecting to dashboard...',
];

function getStepIndex(step: string): number {
  if (step.includes('Done')) return 4;
  if (step.includes('Saving')) return 3;
  if (step.includes('Scoring') || step.includes('Granite')) return 2;
  if (step.includes('Analyzing')) return 1;
  return 0;
}

export default function AnalysisProgress({
  step,
  progress,
}: AnalysisProgressProps) {
  const activeIndex = getStepIndex(step);

  return (
    <div className="w-full max-w-2xl mx-auto glass rounded-xl p-6 border border-purple-500/20">
      <div className="mb-4">
        <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-gray-300"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-right text-xs text-gray-400 mt-1">{progress}%</p>
      </div>

      <ul className="space-y-3">
        {STEPS.map((label, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          const displayLabel =
            index === 1 && step.includes('Analyzing')
              ? step
              : index === 2 && step.includes('Scoring')
                ? step
                : label;

          return (
            <li
              key={index}
              className={`flex items-center gap-3 text-sm ${
                isActive
                  ? 'text-purple-300'
                  : isDone
                    ? 'text-green-400'
                    : 'text-gray-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
              )}
              <span>{displayLabel}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
