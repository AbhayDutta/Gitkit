/**
 * Risk Scoring Logic for GitKit
 * IBM watsonx Granite AI with heuristic fallback
 */

import { mapWithConcurrency } from './concurrency';

export interface FileAnalysis {
  filePath: string;
  commitChurn: number;
  hasTest: boolean;
  fileExtension: string;
}

export interface RiskScore {
  riskScore: number;
  reasons: string[];
}

const GRANITE_MODEL = 'ibm/granite-3-3-8b-instruct';
const AI_FETCH_TIMEOUT_MS = Number(process.env.AI_FETCH_TIMEOUT_MS || 10000);

export function scoreFile({
  filePath,
  commitChurn,
  hasTest,
  fileExtension,
}: FileAnalysis): RiskScore {
  let score = 0;
  const reasons: string[] = [];

  if (fileExtension === '.ts' || fileExtension === '.js') {
    score += 20;
  } else if (fileExtension === '.tsx' || fileExtension === '.jsx') {
    score += 15;
  } else if (fileExtension === '.py') {
    score += 18;
  } else if (fileExtension === '.java' || fileExtension === '.kt') {
    score += 17;
  } else {
    score += 10;
  }

  if (commitChurn > 10) {
    score += 40;
    reasons.push(`Very high commit activity (${commitChurn} recent changes)`);
  } else if (commitChurn > 5) {
    score += 30;
    reasons.push(`High commit activity (${commitChurn} recent changes)`);
  } else if (commitChurn > 2) {
    score += 15;
    reasons.push(`Moderate commit activity (${commitChurn} recent changes)`);
  }

  if (!hasTest) {
    score += 25;
    reasons.push('No corresponding test file found');
  }

  const lowerPath = filePath.toLowerCase();
  if (
    lowerPath.includes('/api/') ||
    lowerPath.includes('\\api\\') ||
    lowerPath.includes('/lib/') ||
    lowerPath.includes('\\lib\\') ||
    lowerPath.includes('/utils/') ||
    lowerPath.includes('\\utils\\') ||
    lowerPath.includes('/core/') ||
    lowerPath.includes('\\core\\')
  ) {
    score += 15;
    reasons.push('Core/critical application file');
  }

  if (
    lowerPath.includes('migration') ||
    lowerPath.includes('schema') ||
    lowerPath.includes('database')
  ) {
    score += 20;
    reasons.push('Database-related file (high impact)');
  }

  if (
    lowerPath.includes('config') ||
    lowerPath.endsWith('.config.ts') ||
    lowerPath.endsWith('.config.js') ||
    lowerPath.includes('env')
  ) {
    score += 18;
    reasons.push('Configuration file (system-wide impact)');
  }

  const pathDepth = filePath.split(/[/\\]/).length;
  if (pathDepth > 6) {
    score += 10;
    reasons.push('Deeply nested file (complex structure)');
  }

  score = Math.min(score, 100);

  if (reasons.length === 0) {
    reasons.push(
      score < 30 ? 'Low complexity, stable file' : 'Standard risk profile'
    );
  }

  return { riskScore: score, reasons };
}

function buildGranitePrompt(analysis: FileAnalysis): string {
  return `You are a senior software engineer. Analyze this file and predict bug risk.
File path: ${analysis.filePath}
Recent commit count: ${analysis.commitChurn}
Has test coverage: ${analysis.hasTest}
File extension: ${analysis.fileExtension}

Respond ONLY with valid JSON:
{
  "riskScore": <number 0-100>,
  "reasons": ["<reason1>", "<reason2>", "<reason3>"]
}`;
}

function parseGraniteResponse(text: string): RiskScore | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const riskScore = Math.min(100, Math.max(0, Number(parsed.riskScore)));
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((r: unknown) => typeof r === 'string').slice(0, 5)
      : [];

    if (Number.isNaN(riskScore)) return null;

    return {
      riskScore,
      reasons: reasons.length > 0 ? reasons : ['AI-assessed risk profile'],
    };
  } catch {
    return null;
  }
}

export async function scoreFileWithAI(
  analysis: FileAnalysis
): Promise<RiskScore> {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const baseUrl = process.env.WATSONX_URL;

  if (!apiKey || !projectId || !baseUrl) {
    return scoreFile(analysis);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/ml/v1/text/generation?version=2023-05-29`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model_id: GRANITE_MODEL,
        project_id: projectId,
        input: buildGranitePrompt(analysis),
        parameters: {
          max_new_tokens: 256,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      console.warn('watsonx API error:', response.status);
      return scoreFile(analysis);
    }

    const data = await response.json();
    const generatedText =
      data.results?.[0]?.generated_text ||
      data.generated_text ||
      '';

    const parsed = parseGraniteResponse(generatedText);
    return parsed ?? scoreFile(analysis);
  } catch (error) {
    console.warn('watsonx scoring failed, using fallback:', error);
    return scoreFile(analysis);
  } finally {
    clearTimeout(timeout);
  }
}

export async function scoreFileAsync(
  analysis: FileAnalysis
): Promise<RiskScore> {
  return scoreFileWithAI(analysis);
}

const AI_SCORE_CONCURRENCY = Number(process.env.AI_SCORE_CONCURRENCY || 6);
const AI_MAX_FILES = Number(process.env.AI_MAX_FILES || 12);

/**
 * Score many files quickly: heuristic for all, Granite only for top candidates.
 */
export async function scoreFilesOptimized(
  analyses: FileAnalysis[],
  onProgress?: (completed: number, total: number) => void
): Promise<RiskScore[]> {
  const hasWatsonx =
    process.env.WATSONX_API_KEY &&
    process.env.WATSONX_PROJECT_ID &&
    process.env.WATSONX_URL;

  const heuristicScores = analyses.map((a) => scoreFile(a));

  if (!hasWatsonx) {
    onProgress?.(analyses.length, analyses.length);
    return heuristicScores;
  }

  // Only send the riskiest files to Granite (biggest speed win)
  const ranked = analyses
    .map((analysis, index) => ({ analysis, index, score: heuristicScores[index].riskScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, AI_MAX_FILES);

  const results = [...heuristicScores];
  let completed = analyses.length - ranked.length;
  onProgress?.(completed, analyses.length);

  await mapWithConcurrency(ranked, AI_SCORE_CONCURRENCY, async ({ analysis, index }) => {
    results[index] = await scoreFileWithAI(analysis);
    completed += 1;
    onProgress?.(completed, analyses.length);
  });

  return results;
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function getRiskLabel(score: number): string {
  const level = getRiskLevel(score);
  if (level === 'high') return 'Critical';
  if (level === 'medium') return 'Warning';
  return 'Safe';
}

export function getRiskColors(score: number) {
  const level = getRiskLevel(score);

  switch (level) {
    case 'high':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500',
        text: 'text-red-400',
        glow: 'shadow-red-500/20',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500',
        text: 'text-yellow-400',
        glow: 'shadow-yellow-500/20',
      };
    case 'low':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500',
        text: 'text-green-400',
        glow: 'shadow-green-500/20',
      };
  }
}
