import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSavedProjects } from "@/lib/neon";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ExternalLink, FolderHeart, ArrowRight } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { redirect } from "next/navigation";
import RepoConnector from "@/components/RepoConnector";

export const dynamic = 'force-dynamic';

export default async function MyProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const githubId = (session.user as any).id as string;
  const username = (session.user as any).username as string | undefined;
  const projects = await getUserSavedProjects(githubId);

  let githubRepos: string[] = [];
  if (username) {
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, {
        next: { revalidate: 60 }
      });
      if (res.ok) {
        const repos = await res.json();
        githubRepos = repos.map((r: any) => r.html_url);
        
        // Filter out repos that are already saved
        const savedUrls = projects.map(p => p.github_url.toLowerCase());
        githubRepos = githubRepos.filter(url => !savedUrls.includes(url.toLowerCase()));
      }
    } catch (e) {
      console.error("Failed to fetch github repos", e);
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      <AnimatedBackground />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 relative z-10 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <FolderHeart className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold text-white">My Projects</h1>
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Analyze a New Repository</h2>
            <RepoConnector suggestedRepos={githubRepos.length > 0 ? githubRepos : undefined} />
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">Saved Analyses</h2>
          {projects.length === 0 ? (
            <div className="glass-dark p-8 rounded-2xl border border-purple-500/20 text-center">
              <p className="text-gray-400 mb-6 text-lg">You haven't saved any projects yet.</p>
              <Link 
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all"
              >
                Go to Home
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((repo) => (
                <div key={repo.id} className="glass-dark p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{repo.repo_name}</h3>
                      <p className="text-gray-400 text-sm">Owner: {repo.owner}</p>
                    </div>
                    <a 
                      href={repo.github_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-400"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-purple-500/10 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Analyzed: {new Date(repo.analyzed_at).toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/dashboard/${repo.id}`}
                      className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                    >
                      View Analysis <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
