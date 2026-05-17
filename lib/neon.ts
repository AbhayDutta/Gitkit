/**
 * Neon Database Connection and Query Functions
 * Handles all database operations for Predict-a-Bug
 */

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Neon URLs copied with channel_binding=require break @neondatabase/serverless
 * fetch on Windows/Node — strip it while keeping sslmode=require.
 */
function normalizeDatabaseUrl(url: string): string {
  return url
    .replace(/[&?]channel_binding=require/gi, '')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

const sql = neon(normalizeDatabaseUrl(process.env.DATABASE_URL));
let initializeDatabasePromise: Promise<void> | null = null;

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase() {
  initializeDatabasePromise ??= initializeDatabaseSchema().catch((error) => {
    initializeDatabasePromise = null;
    throw error;
  });

  return initializeDatabasePromise;
}

async function initializeDatabaseSchema() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        github_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Ensure password_hash column exists for Credentials login
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT
    `;

    // Create repos table
    await sql`
      CREATE TABLE IF NOT EXISTS repos (
        id SERIAL PRIMARY KEY,
        github_url TEXT NOT NULL,
        owner TEXT,
        repo_name TEXT,
        analyzed_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create file_scores table
    await sql`
      CREATE TABLE IF NOT EXISTS file_scores (
        id SERIAL PRIMARY KEY,
        repo_id INTEGER REFERENCES repos(id) ON DELETE CASCADE,
        file_path TEXT,
        risk_score INTEGER,
        reasons JSONB,
        commit_churn INTEGER,
        has_test BOOLEAN,
        analyzed_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_file_scores_repo_id 
      ON file_scores(repo_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_file_scores_risk_score 
      ON file_scores(risk_score DESC)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS analysis_progress (
        id SERIAL PRIMARY KEY,
        repo_id INTEGER,
        step TEXT,
        progress INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_analysis_progress_repo_id
      ON analysis_progress(repo_id)
    `;

    
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        github_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS saved_projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        repo_id INTEGER REFERENCES repos(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, repo_id)
      )
    `;

    console.log('Database initialized successfully');

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export interface Repo {
  id: number;
  github_url: string;
  owner: string;
  repo_name: string;
  analyzed_at: Date;
}

export interface FileScore {
  id: number;
  repo_id: number;
  file_path: string;
  risk_score: number;
  reasons: string[];
  commit_churn: number;
  has_test: boolean;
  analyzed_at: Date;
}

/**
 * Insert a new repository record
 */
export async function insertRepo(
  githubUrl: string,
  owner: string,
  repoName: string
): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO repos (github_url, owner, repo_name)
      VALUES (${githubUrl}, ${owner}, ${repoName})
      RETURNING id
    `;

    return result[0].id;
  } catch (error) {
    console.error('Error inserting repo:', error);
    throw error;
  }
}

/**
 * Insert file scores for a repository
 */
export async function insertFileScores(
  repoId: number,
  fileScores: Array<{
    filePath: string;
    riskScore: number;
    reasons: string[];
    commitChurn: number;
    hasTest: boolean;
  }>
): Promise<void> {
  try {
    const BATCH = 20;
    for (let i = 0; i < fileScores.length; i += BATCH) {
      const batch = fileScores.slice(i, i + BATCH);
      await Promise.all(
        batch.map((file) =>
          sql`
            INSERT INTO file_scores (
              repo_id,
              file_path,
              risk_score,
              reasons,
              commit_churn,
              has_test
            )
            VALUES (
              ${repoId},
              ${file.filePath},
              ${file.riskScore},
              ${JSON.stringify(file.reasons)},
              ${file.commitChurn},
              ${file.hasTest}
            )
          `
        )
      );
    }

    console.log(`Inserted ${fileScores.length} file scores for repo ${repoId}`);
  } catch (error) {
    console.error('Error inserting file scores:', error);
    throw error;
  }
}

/**
 * Get repository by ID
 */
export async function getRepoById(repoId: number): Promise<Repo | null> {
  try {
    const result = await sql`
      SELECT * FROM repos WHERE id = ${repoId}
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0] as Repo;
  } catch (error) {
    console.error('Error fetching repo:', error);
    throw error;
  }
}

/**
 * Get all file scores for a repository
 */
export async function getFileScoresByRepoId(
  repoId: number
): Promise<FileScore[]> {
  try {
    const result = await sql`
      SELECT * FROM file_scores 
      WHERE repo_id = ${repoId}
      ORDER BY risk_score DESC
    `;

    return result as FileScore[];
  } catch (error) {
    console.error('Error fetching file scores:', error);
    throw error;
  }
}

/**
 * Get repository with all file scores
 */
export async function getRepoWithScores(repoId: number): Promise<{
  repo: Repo | null;
  files: FileScore[];
}> {
  try {
    const repo = await getRepoById(repoId);
    const files = repo ? await getFileScoresByRepoId(repoId) : [];

    return { repo, files };
  } catch (error) {
    console.error('Error fetching repo with scores:', error);
    throw error;
  }
}

/**
 * Check if a repository URL already exists
 */
export async function findRepoByUrl(githubUrl: string): Promise<Repo | null> {
  try {
    const result = await sql`
      SELECT * FROM repos 
      WHERE github_url = ${githubUrl}
      ORDER BY analyzed_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return result[0] as Repo;
  } catch (error) {
    console.error('Error finding repo by URL:', error);
    throw error;
  }
}

/**
 * Delete old analysis for a repository (for re-analysis)
 */
export async function deleteRepoAnalysis(repoId: number): Promise<void> {
  try {
    // File scores will be deleted automatically due to CASCADE
    await sql`
      DELETE FROM repos WHERE id = ${repoId}
    `;

    console.log(`Deleted analysis for repo ${repoId}`);
  } catch (error) {
    console.error('Error deleting repo analysis:', error);
    throw error;
  }
}

export interface AnalysisProgress {
  id: number;
  repo_id: number;
  step: string;
  progress: number;
  updated_at: Date;
}

export async function upsertAnalysisProgress(
  repoId: number,
  step: string,
  progress: number
): Promise<void> {
  try {
    const existing = await sql`
      SELECT id FROM analysis_progress WHERE repo_id = ${repoId} LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE analysis_progress
        SET step = ${step}, progress = ${progress}, updated_at = NOW()
        WHERE repo_id = ${repoId}
      `;
    } else {
      await sql`
        INSERT INTO analysis_progress (repo_id, step, progress)
        VALUES (${repoId}, ${step}, ${progress})
      `;
    }
  } catch (error) {
    console.error('Error updating analysis progress:', error);
  }
}

export async function getAnalysisProgress(
  repoId: number
): Promise<AnalysisProgress | null> {
  try {
    const result = await sql`
      SELECT * FROM analysis_progress
      WHERE repo_id = ${repoId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (result.length === 0) return null;
    return result[0] as AnalysisProgress;
  } catch (error) {
    console.error('Error fetching analysis progress:', error);
    return null;
  }
}

export async function getRepoAnalysisHistory(githubUrl: string) {
  try {
    const repos = await sql`
      SELECT r.id, r.analyzed_at
      FROM repos r
      WHERE r.github_url = ${githubUrl}
      ORDER BY r.analyzed_at ASC
    `;

    const history = [];
    for (const repo of repos) {
      const stats = await getRepoStats(repo.id);
      history.push({
        repoId: repo.id,
        analyzedAt: repo.analyzed_at,
        avgRiskScore: stats.avgRiskScore,
        criticalCount: stats.highRiskFiles,
        totalFiles: stats.totalFiles,
      });
    }
    return history;
  } catch (error) {
    console.error('Error fetching repo analysis history:', error);
    return [];
  }
}

/**
 * Get statistics for a repository
 */
export async function getRepoStats(repoId: number): Promise<{
  totalFiles: number;
  highRiskFiles: number;
  mediumRiskFiles: number;
  lowRiskFiles: number;
  avgRiskScore: number;
  filesWithoutTests: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk_files,
        COUNT(*) FILTER (WHERE risk_score >= 40 AND risk_score < 70) as medium_risk_files,
        COUNT(*) FILTER (WHERE risk_score < 40) as low_risk_files,
        AVG(risk_score)::INTEGER as avg_risk_score,
        COUNT(*) FILTER (WHERE has_test = false) as files_without_tests
      FROM file_scores
      WHERE repo_id = ${repoId}
    `;

    if (result.length === 0) {
      return {
        totalFiles: 0,
        highRiskFiles: 0,
        mediumRiskFiles: 0,
        lowRiskFiles: 0,
        avgRiskScore: 0,
        filesWithoutTests: 0,
      };
    }

    return {
      totalFiles: Number(result[0].total_files),
      highRiskFiles: Number(result[0].high_risk_files),
      mediumRiskFiles: Number(result[0].medium_risk_files),
      lowRiskFiles: Number(result[0].low_risk_files),
      avgRiskScore: Number(result[0].avg_risk_score),
      filesWithoutTests: Number(result[0].files_without_tests),
    };
  } catch (error) {
    console.error('Error fetching repo stats:', error);
    throw error;
  }
}


/**
 * Save a project for a user
 */
export async function saveProject(githubId: string, repoId: number): Promise<void> {
  try {
    let userResult = await sql`SELECT id FROM users WHERE github_id = ${githubId}`;
    if (userResult.length === 0) {
      userResult = await sql`INSERT INTO users (github_id) VALUES (${githubId}) RETURNING id`;
    }
    const userId = userResult[0].id;
    await sql`
      INSERT INTO saved_projects (user_id, repo_id)
      VALUES (${userId}, ${repoId})
      ON CONFLICT (user_id, repo_id) DO NOTHING
    `;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
}

/**
 * Get user saved projects
 */
export async function getUserSavedProjects(githubId: string) {
  try {
    const result = await sql`
      SELECT r.* 
      FROM repos r
      JOIN saved_projects sp ON r.id = sp.repo_id
      JOIN users u ON sp.user_id = u.id
      WHERE u.github_id = ${githubId}
      ORDER BY sp.saved_at DESC
    `;
    return result;
  } catch (error) {
    console.error('Error fetching user saved projects:', error);
    return [];
  }
}

/**
 * Get user record by their unique email address
 */
export async function getUserByEmail(email: string) {
  try {
    const result = await sql`
      SELECT * FROM users 
      WHERE github_id = ${email} 
      LIMIT 1
    `;
    if (result.length === 0) return null;
    return result[0];
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

/**
 * Create a new user with password hash
 */
export async function createUserWithPassword(email: string, passwordHash: string) {
  try {
    const result = await sql`
      INSERT INTO users (github_id, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Error creating user with password:', error);
    throw error;
  }
}

// Made with Bob

