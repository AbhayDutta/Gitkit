'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ExternalLink, LogIn, LogOut, FolderHeart } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import AuthModal from './AuthModal';

interface NavbarProps {
  githubHref?: string;
  githubLabel?: string;
}

export default function Navbar({
  githubHref = 'https://github.com',
  githubLabel = 'GitHub',
}: NavbarProps) {
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass-dark border-b border-purple-500/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Sparkles className="w-8 h-8 text-purple-500 group-hover:text-gray-300 transition-colors" />
          <span className="text-xl font-bold gradient-text">GitKit</span>
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link
                href="/dashboard/my-projects"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <FolderHeart className="w-5 h-5" />
                <span className="hidden sm:inline">My Projects</span>
              </Link>
              <div className="flex items-center gap-3 border-l border-purple-500/20 pl-4">
                {session.user.image && (
                  <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-purple-500/30" />
                )}
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href={githubHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition-all"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="hidden sm:inline">{githubLabel}</span>
              </a>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            </>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
}
