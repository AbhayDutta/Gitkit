'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, LogIn, Sparkles } from 'lucide-react';
import { signIn } from 'next-auth/react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/my-projects';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(urlError ? 'Authentication failed. Please check your credentials.' : '');
  const [isLoading, setIsLoading] = useState(false);

  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Please enter a valid @gmail.com address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(callbackUrl);
        // Refresh page to ensure global auth state updates instantly
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signIn('github', { callbackUrl });
    } catch (err) {
      setError('GitHub authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring' }}
      className="w-full max-w-md overflow-hidden rounded-2xl glass-dark border border-purple-500/30 p-8 shadow-2xl shadow-purple-500/10 z-10"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-3 group mb-4">
          <Sparkles className="w-8 h-8 text-purple-500 group-hover:text-gray-300 transition-colors animate-pulse" />
          <span className="text-2xl font-bold gradient-text">GitKit</span>
        </Link>
        <h2 className="text-xl font-semibold text-gray-200">
          Sign In to Your Account
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Connect via GitHub or Gmail to manage and save analyses
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-sm text-red-400 text-center"
        >
          {error}
        </motion.div>
      )}

      {/* GitHub Button */}
      <button
        onClick={handleGitHubLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 text-gray-200 transition-all font-semibold hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
        </svg>
        <span>Continue with GitHub</span>
      </button>

      {/* Divider */}
      <div className="flex items-center my-6 gap-3">
        <div className="flex-1 h-[1px] bg-purple-500/10" />
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">or</span>
        <div className="flex-1 h-[1px] bg-purple-500/10" />
      </div>

      {/* Gmail Login Form */}
      <form onSubmit={handleGmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Gmail Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Mail className="w-5 h-5" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3.5 bg-purple-950/20 border border-purple-500/20 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Lock className="w-5 h-5" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3.5 bg-purple-950/20 border border-purple-500/20 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign In with Gmail</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Auto-register prompt */}
      <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
        * Note: If you don't have a GitKit account yet, entering a new Gmail & password will create one instantly.
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black relative flex flex-col items-center justify-center p-4">
      <AnimatedBackground />
      <Suspense fallback={<Loader2 className="w-8 h-8 text-purple-500 animate-spin" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
