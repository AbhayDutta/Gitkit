'use client';

import { FileCode, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRiskColors, getRiskLevel } from '@/lib/scorer';

interface FileRiskCardProps {
  path: string;
  riskScore: number;
  reasons: string[];
  commitChurn: number;
  hasTest: boolean;
  index: number;
}

export default function FileRiskCard({
  path,
  riskScore,
  reasons,
  commitChurn,
  hasTest,
  index,
}: FileRiskCardProps) {
  const colors = getRiskColors(riskScore);
  const level = getRiskLevel(riskScore);

  // Get icon based on risk level
  const RiskIcon = level === 'high' 
    ? AlertTriangle 
    : level === 'medium' 
    ? AlertCircle 
    : CheckCircle;

  // Truncate long file paths
  const displayPath = path.length > 50 ? `...${path.slice(-47)}` : path;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`
        relative p-6 rounded-lg border-2 ${colors.border} ${colors.bg}
        glass backdrop-blur-md bg-white/5 transition-all duration-300
        hover:shadow-lg hover:shadow-purple-500/10
      `}
    >
      {/* Risk Score Badge */}
      <div className="absolute top-4 right-4">
        <div
          className={`
            flex items-center justify-center w-16 h-16 rounded-full
            ${colors.bg} ${colors.border} border-2
          `}
        >
          <span className={`text-2xl font-bold ${colors.text}`}>
            {riskScore}
          </span>
        </div>
      </div>

      {/* File Path */}
      <div className="flex items-start gap-3 mb-4 pr-20">
        <FileCode className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-1`} />
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-mono text-gray-200 break-all"
            title={path}
          >
            {displayPath}
          </h3>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="flex items-center gap-2 mb-4">
        <RiskIcon className={`w-4 h-4 ${colors.text}`} />
        <span className={`text-sm font-semibold uppercase ${colors.text}`}>
          {level === 'high' && '🔴 Critical'}
          {level === 'medium' && '🟡 Warning'}
          {level === 'low' && '🟢 Safe'}
        </span>
      </div>

      {/* Reasons */}
      <div className="space-y-2">
        {reasons.slice(0, 3).map((reason, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className={`text-xs ${colors.text} mt-0.5`}>•</span>
            <p className="text-sm text-gray-300 leading-relaxed">{reason}</p>
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-4 text-xs text-gray-400">
        <span>
          Commits: <span className="font-semibold text-gray-300">{commitChurn}</span>
        </span>
        <span className="flex items-center gap-1">
          Tests: 
          {hasTest ? (
            <CheckCircle className="w-3 h-3 text-green-400" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-red-400" />
          )}
        </span>
      </div>
    </motion.div>
  );
}

// Made with Bob
