# Setup Guide for Predict-a-Bug

Follow these steps to get the application running on your local machine.

## Step 1: Install Dependencies

The dependencies should already be installed, but if not:

```bash
cd predict-a-bug
npm install
```

## Step 2: Configure Environment Variables

You need to set up two environment variables in `.env.local`:

### 1. Neon Database URL

1. Go to [Neon Console](https://console.neon.tech)
2. Sign up or log in
3. Create a new project (or use an existing one)
4. Copy the connection string from the dashboard
5. Paste it in `.env.local`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. GitHub Personal Access Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name: "Predict-a-Bug"
4. Select scopes:
   - ✅ `public_repo` (for analyzing public repositories)
   - OR ✅ `repo` (if you want to analyze private repos too)
5. Click "Generate token"
6. Copy the token (you won't see it again!)
7. Paste it in `.env.local`:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Your complete `.env.local` should look like:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Run the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

## Step 4: Test the Application

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You should see the landing page with "Predict-a-Bug 🔮"
3. Try analyzing a repository:
   - Paste a GitHub URL (e.g., `https://github.com/vercel/next.js`)
   - Click "Analyze Repository"
   - Wait for the analysis to complete (10-30 seconds)
   - You'll be redirected to the dashboard showing risk scores

## Troubleshooting

### Database Connection Error

If you see a database connection error:

1. Verify your `DATABASE_URL` is correct
2. Make sure your Neon project is active
3. Check that the connection string includes `?sslmode=require`

### GitHub API Rate Limit

If you hit rate limits:

1. Make sure your `GITHUB_TOKEN` is set correctly
2. Without a token: 60 requests/hour
3. With a token: 5,000 requests/hour

### TypeScript Errors

The TypeScript errors you see in the editor are expected and won't affect runtime. They're due to how Next.js handles JSX types. The app will work correctly when running.

### Port Already in Use

If port 3000 is already in use:

```bash
npm run dev -- -p 3001
```

This will run the app on port 3001 instead.

## Database Schema

The database tables are created automatically on the first analysis. You don't need to run any SQL scripts manually.

The app will create:
- `repos` table - stores repository information
- `file_scores` table - stores risk scores for each file

## Next Steps

Once the app is running:

1. Try analyzing different repositories
2. Compare risk scores across files
3. Look for patterns in high-risk files
4. Use the insights to prioritize code reviews and testing

## Production Deployment

To deploy to production (e.g., Vercel):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add the environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `GITHUB_TOKEN`
4. Deploy!

The app will automatically build and deploy.

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Check the terminal for server-side errors
3. Verify your environment variables are set correctly
4. Make sure you have an active internet connection

## Features to Try

- **Analyze Popular Repos**: Try analyzing well-known repositories like React, Vue, or Next.js
- **Compare Results**: Analyze multiple repositories and compare their risk profiles
- **Re-analyze**: Use the "Re-analyze" button to get updated scores after new commits
- **Filter by Risk**: Focus on high-risk files that need attention

Enjoy using Predict-a-Bug! 🔮