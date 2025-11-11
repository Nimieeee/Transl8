# Deploy to Railway - Quick Start

Railway is the best free option for this monorepo project.

## Why Railway?

- ✅ $5/month free credit (enough for development)
- ✅ Excellent monorepo support
- ✅ Automatic environment detection
- ✅ Simple configuration
- ✅ Built-in PostgreSQL and Redis
- ✅ No credit card required for trial

## Setup Steps

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

Or with Homebrew:
```bash
brew install railway
```

### 2. Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### 3. Initialize Project

```bash
railway init
```

Select "Create new project" and give it a name like "transl8-backend"

### 4. Add PostgreSQL Database

```bash
railway add --database postgresql
```

### 5. Add Redis

```bash
railway add --database redis
```

### 6. Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set JWT_SECRET=your-secret-key-here
railway variables set OPENAI_API_KEY=your-key
railway variables set MISTRAL_API_KEY=your-key
railway variables set FRONTEND_URL=https://your-frontend.vercel.app
```

Railway will automatically set DATABASE_URL and REDIS_URL from the databases you added.

### 7. Deploy

```bash
railway up
```

That's it! Railway will:
- Detect it's a Node.js project
- Run `npm install`
- Run `npm run build` (from package.json)
- Start with `npm start`

### 8. Get Your URL

```bash
railway domain
```

This generates a public URL for your backend.

## Configuration File (Optional)

Create `railway.json` in the root:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run prisma:generate"
  },
  "deploy": {
    "startCommand": "npm run start --workspace=@dubbing/backend",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Useful Commands

```bash
# View logs
railway logs

# Open dashboard
railway open

# Link to existing project
railway link

# Run migrations
railway run npm run prisma:migrate:deploy --workspace=@dubbing/backend

# Check status
railway status
```

## Advantages Over Render

1. **Better monorepo support** - Handles workspaces correctly
2. **Faster deployments** - Usually 2-3x faster
3. **Better logs** - Real-time streaming
4. **Simpler configuration** - Less YAML wrestling
5. **Built-in databases** - PostgreSQL and Redis included

## Cost

- Free: $5/month credit (enough for 1-2 small services)
- Hobby: $5/month + usage
- Pro: $20/month + usage

For development, the free tier is perfect!
