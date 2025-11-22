# Deployment Guide V2: Render, Vercel, Supabase, OpenAI

This guide details how to deploy the refactored `Transl8` application.

## 1. Database (Supabase)
1.  Create a new project on [Supabase](https://supabase.com/).
2.  Get the **Transaction Connection Pooler String** (or Session mode if using Prisma directly without pgbouncer, but Transaction is recommended for serverless/edge).
    *   Format: `postgres://[user]:[password]@[host]:[port]/[db]`
3.  This will be your `DATABASE_URL`.

## 2. Backend & Workers (Render - Single Service)
Since you are using the Render Free Tier, we will deploy the Backend and Workers as a **single service**.

### Web Service
1.  Create a new **Web Service** on Render.
2.  Connect your repository.
3.  Select **Docker** as the Runtime.
4.  **Root Directory**: `.` (Root of the repo)
5.  **Dockerfile Path**: `packages/backend/Dockerfile`
6.  **Environment Variables**:
    *   `DATABASE_URL`: (Your Supabase URL)
    *   `OPENAI_API_KEY`: (Your OpenAI API Key)
    *   `MISTRAL_API_KEY`: (Your Mistral API Key)
    *   `REDIS_HOST`: (Your Redis Host - Render Redis or external)
    *   `REDIS_PORT`: (Your Redis Port)
    *   `REDIS_PASSWORD`: (If applicable)
    *   `PORT`: `3001`
    *   `FRONTEND_URL`: (Your Vercel Frontend URL)

**Note:** The `Dockerfile` is configured to build both the backend and workers, and the start command (`npm run start:with-workers`) runs them concurrently in the same container.

### Option B: Node Runtime (Alternative)
If you prefer to use the **Node** runtime instead of Docker:
1.  **Runtime**: Node
2.  **Build Command**: `npm install && npm run build:backend && npm run build:workers`
3.  **Start Command**: `node packages/backend/start-with-workers.js`
4.  **Environment Variables**: Same as above.

## 3. Frontend (Vercel)
1.  Import the repository into Vercel.
2.  **Framework Preset**: Next.js
3.  **Root Directory**: `packages/frontend` (You can set this in project settings, or let Vercel detect it. If deploying from root, override build command).
    *   *Recommended*: Set "Root Directory" to `packages/frontend` in Vercel Project Settings.
4.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: (Your Render Backend URL, e.g., `https://your-backend.onrender.com`)

## 4. Migration
Once the backend is deployed (or locally), run the migration:
```bash
# Locally
export DATABASE_URL="your-supabase-url"
npm run prisma:migrate:deploy --workspace=@dubbing/backend
```
Or set it as a "Build Command" or "Pre-Deploy Command" in Render if supported, but running locally once is easier.

## 5. Verification
1.  Open the Vercel URL.
2.  Upload a video.
3.  Check Render logs for Backend and Workers to see the job processing (STT -> Translation/Adaptation -> TTS).
