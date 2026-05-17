# Predict-a-Bug 🔮

AI-Powered Repository Risk Analysis - Analyze GitHub repositories to predict which files are most likely to break.

## Features

- 🔍 **GitHub Integration** - Analyze any public GitHub repository
- 🤖 **AI Risk Scoring** - Smart analysis based on commit history, test coverage, and file patterns
- 📊 **Visual Heatmap** - Beautiful color-coded dashboard showing risk levels
- ⚡ **Real-time Analysis** - Fast processing with Neon serverless PostgreSQL
- 🎨 **Modern UI** - Dark theme with smooth animations using Framer Motion

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon (Serverless PostgreSQL)
- **APIs**: GitHub REST API
- **UI Libraries**: Framer Motion, Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Neon database account ([sign up here](https://console.neon.tech))
- A GitHub personal access token ([create one here](https://github.com/settings/tokens))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd predict-a-bug
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and add your credentials:
   ```env
   DATABASE_URL=your_neon_connection_string_here
   GITHUB_TOKEN=your_github_token_here
   ```

   **Getting your Neon connection string:**
   - Go to [Neon Console](https://console.neon.tech)
   - Create a new project or select an existing one
   - Copy the connection string from the dashboard
   - It should look like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

   **Creating a GitHub token:**
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name like "Predict-a-Bug"
   - Select scopes: `public_repo` (for public repos) or `repo` (for private repos)
   - Click "Generate token" and copy it

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

### 1. Repository Analysis

When you submit a GitHub repository URL:

1. The app fetches the repository's file tree using the GitHub API
2. It retrieves the last 30 commits to calculate commit churn
3. For each file, it checks if a corresponding test file exists
4. All data is processed through the risk scoring algorithm

### 2. Risk Scoring Algorithm

Each file receives a risk score (0-100) based on:

- **Base Score** (by file type):
  - TypeScript/JavaScript: 20 points
  - TSX/JSX: 15 points
  - Python: 18 points
  - Java/Kotlin: 17 points

- **Commit Churn**:
  - Very high (>10 commits): +40 points
  - High (>5 commits): +30 points
  - Moderate (>2 commits): +15 points

- **Test Coverage**:
  - No test file found: +25 points

- **File Location**:
  - Core directories (/api, /lib, /utils, /core): +15 points
  - Database files: +20 points
  - Configuration files: +18 points
  - Deeply nested files: +10 points

### 3. Risk Levels

Files are categorized into three risk levels:

- 🔴 **High Risk** (70-100): Files that need immediate attention
- 🟡 **Medium Risk** (40-69): Files that should be monitored
- 🟢 **Low Risk** (0-39): Stable files with low risk

### 4. Dashboard

The dashboard displays:

- Repository information and analysis timestamp
- Statistics (total files, risk distribution, average score)
- Interactive risk heatmap with all files sorted by risk score
- Detailed reasons for each file's risk score

## Project Structure

```
predict-a-bug/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts          # POST endpoint for repo analysis
│   │   └── scores/
│   │       └── [repoId]/
│   │           └── route.ts      # GET endpoint for fetching scores
│   ├── dashboard/
│   │   └── [repoId]/
│   │       └── page.tsx          # Dashboard page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── FileRiskCard.tsx          # Individual file risk card
│   ├── RiskHeatmap.tsx           # Grid of file cards
│   └── RepoConnector.tsx         # Landing page input form
├── lib/
│   ├── github.ts                 # GitHub API helpers
│   ├── neon.ts                   # Database connection & queries
│   └── scorer.ts                 # Risk scoring algorithm
└── public/                       # Static assets
```

## Database Schema

The app uses two tables:

### `repos` table
```sql
CREATE TABLE repos (
  id SERIAL PRIMARY KEY,
  github_url TEXT NOT NULL,
  owner TEXT,
  repo_name TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW()
);
```

### `file_scores` table
```sql
CREATE TABLE file_scores (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER REFERENCES repos(id) ON DELETE CASCADE,
  file_path TEXT,
  risk_score INTEGER,
  reasons JSONB,
  commit_churn INTEGER,
  has_test BOOLEAN,
  analyzed_at TIMESTAMP DEFAULT NOW()
);
```

Tables are created automatically on first analysis.

## API Endpoints

### POST /api/analyze

Analyzes a GitHub repository and stores results.

**Request:**
```json
{
  "repoUrl": "https://github.com/user/repo"
}
```

**Response:**
```json
{
  "repoId": 1,
  "owner": "user",
  "repo": "repo",
  "totalFiles": 42,
  "files": [
    {
      "path": "src/app.ts",
      "riskScore": 75,
      "reasons": ["High commit activity", "No test file found"],
      "commitChurn": 8,
      "hasTest": false
    }
  ]
}
```

### GET /api/scores/[repoId]

Fetches stored analysis results.

**Response:**
```json
{
  "repo": {
    "id": 1,
    "githubUrl": "https://github.com/user/repo",
    "owner": "user",
    "repoName": "repo",
    "analyzedAt": "2026-05-16T07:48:52.126Z"
  },
  "stats": {
    "totalFiles": 42,
    "highRiskFiles": 5,
    "mediumRiskFiles": 15,
    "lowRiskFiles": 22,
    "avgRiskScore": 45,
    "filesWithoutTests": 18
  },
  "files": [...]
}
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:

- `DATABASE_URL` - Your Neon connection string
- `GITHUB_TOKEN` - Your GitHub personal access token

## Limitations

- Analyzes up to 100 files per repository (to avoid timeouts)
- Requires public repositories or a GitHub token with appropriate permissions
- GitHub API rate limits apply (60 requests/hour without token, 5000 with token)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Acknowledgments
- Built with [Next.js](https://nextjs.org/)
- Database powered by [Neon](https://neon.tech/)
- Icons from [Lucide](https://lucide.dev/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
