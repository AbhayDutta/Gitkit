'use client';

import { TrendingUp, Shield, Code2, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AnimatedBackground from '@/components/AnimatedBackground';
import RepoConnector from '@/components/RepoConnector';

function HomeContent() {
  return (
    <main className="min-h-screen animated-bg relative">
      <AnimatedBackground />
      <Navbar />

      <motion.div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">GitKit</span>
            <span className="ml-3">🔮</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-4">
            AI-Powered Repository Risk Analysis
          </p>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto">
            Analyze GitHub repositories with IBM watsonx Granite AI. Predict which
            files are most likely to break using commit history, test coverage,
            and intelligent risk scoring.
          </p>
        </motion.div>

        <RepoConnector />

        <motion.div
          className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {[
            {
              icon: Code2,
              title: 'GitHub Integration',
              desc: 'Analyze any public repository with real-time data fetching',
            },
            {
              icon: Brain,
              title: 'IBM Granite AI',
              desc: 'watsonx.ai powered risk scoring with heuristic fallback',
            },
            {
              icon: TrendingUp,
              title: 'Risk Trend Charts',
              desc: 'Bar, pie, and line charts visualize risk over time',
            },
            {
              icon: Shield,
              title: 'Export Reports',
              desc: 'Download CSV and PDF reports for your team',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              className="text-center p-6 rounded-xl glass border border-purple-500/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-gray-300/20 mb-4">
                <feature.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <footer className="border-t border-purple-500/10 py-8 mt-24 relative z-10">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>GitKit — Built with Next.js, IBM watsonx Granite, and Neon PostgreSQL</p>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return <HomeContent />;
}
