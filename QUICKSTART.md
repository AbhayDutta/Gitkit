# Quick Start Guide

Get Predict-a-Bug running in 5 minutes! ⚡

## Prerequisites

- Node.js 18+ installed
- A Neon account (free tier works!)
- A GitHub account

## 1. Install Dependencies (30 seconds)

```bash
cd predict-a-bug
npm install
```

## 2. Get Your Credentials (2 minutes)

### Neon Database URL

1. Visit [console.neon.tech](https://console.neon.tech)
2. Sign up (free, no credit card required)
3. Create a new project
4. Copy the connection string

### GitHub Token

1. Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name it "Predict-a-Bug"
4. Check `public_repo` scope
5. Generate and copy the token

## 3. Configure Environment (1 minute)

Edit `.env.local` and paste your credentials:

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
GITHUB_TOKEN=ghp_your_token_here
```

## 4. Run the App (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Test It! (1 minute)

1. Paste this URL: `https://github.com/vercel/next.js`
2. Click "Analyze Repository"
3. Wait 10-20 seconds
4. See the risk heatmap! 🎉

## That's It!

You now have a working AI-powered repository risk analyzer!

## What's Next?

- Try analyzing your own repositories
- Check out the [README.md](README.md) for detailed documentation
- Read [SETUP.md](SETUP.md) for troubleshooting tips

## Common Issues

**"Database connection failed"**
- Double-check your DATABASE_URL in `.env.local`
- Make sure it includes `?sslmode=require`

**"GitHub API rate limit"**
- Make sure your GITHUB_TOKEN is set correctly
- Check that the token has `public_repo` scope

**"Port 3000 already in use"**
```bash
npm run dev -- -p 3001
```

Need help? Check the full [SETUP.md](SETUP.md) guide!