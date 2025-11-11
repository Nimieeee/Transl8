# MVP Prototype - Quick Start Guide

This is a minimal viable prototype of the AI video dubbing platform. It demonstrates the core end-to-end flow: user registration, video upload, automated dubbing, and download.

## What's Included

The MVP includes:
- ✅ User authentication (register/login)
- ✅ Video upload (MP4, max 100MB)
- ✅ Automated dubbing pipeline (English to Spanish)
- ✅ Real-time progress tracking
- ✅ Video download (24-hour expiration)

## What's NOT Included

To keep the MVP simple, these features are excluded:
- ❌ Payment/subscription system
- ❌ Multiple projects management
- ❌ Transcript editing
- ❌ Voice cloning
- ❌ Multiple language pairs
- ❌ Lip sync
- ❌ Advanced settings

## Prerequisites

Before starting, ensure you have:

1. **Node.js 20+** - [Download here](https://nodejs.org)
2. **Docker Desktop** - [Download here](https://docker.com)
3. **npm 9+** (comes with Node.js)

Verify installations:
```bash
node --version   # Should be v20.x.x or higher
docker --version # Should be 20.x.x or higher
npm --version    # Should be 9.x.x or higher
```

## Quick Start (5 minutes)

### Option 1: Automated Setup (Recommended)

Run the startup script that handles everything:

```bash
./mvp-start.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Create environment files
3. ✅ Install dependencies
4. ✅ Start PostgreSQL and Redis
5. ✅ Initialize database
6. ✅ Start backend, frontend, and worker

Once you see "Setup complete!", the services will start automatically.

### Option 2: Manual Setup

If you prefer to run steps manually:

#### 1. Install dependencies
```bash
npm install
```

#### 2. Create environment files

**Backend** (`packages/backend/.env`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=mvp-dev-secret-change-in-production
JWT_ACCESS_EXPIRY=24h
API_PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Workers** (`packages/workers/.env`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=1
NODE_ENV=development
```

**Frontend** (`packages/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 3. Start database and Redis
```bash
docker-compose up -d postgres redis
```

Wait ~10 seconds for services to be ready.

#### 4. Initialize database
```bash
cd packages/backend
npm run prisma:generate
npm run db:push
cd ../..
```

#### 5. Start all services
```bash
npm run dev
```

## Using the MVP

### 1. Open the application
Navigate to: **http://localhost:3000**

### 2. Register an account
- Click "Register" or go to `/register`
- Enter email and password
- Click "Create Account"

### 3. Upload a video
- You'll be redirected to the upload page
- Select an MP4 video file (max 100MB)
- Choose target language (currently only Spanish)
- Click "Upload and Start Dubbing"

### 4. Track progress
- You'll be redirected to the status page
- Watch the progress bar update in real-time
- The page polls every 2 seconds for updates

### 5. Download result
- When complete, you'll be redirected to download page
- Click "Download Dubbed Video"
- Video expires after 24 hours

## Architecture

```
┌─────────────┐
│   Browser   │
│ (localhost: │
│    3000)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  Frontend   │─────▶│  Backend API │
│  (Next.js)  │      │  (Express)   │
└─────────────┘      │ (localhost:  │
                     │    3001)     │
                     └──────┬───────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌─────────┐ ┌────────┐
         │PostgreSQL│ │  Redis  │ │ Worker │
         │  (5432)  │ │ (6379)  │ │(BullMQ)│
         └──────────┘ └─────────┘ └────────┘
```

## Dubbing Pipeline

The worker processes videos through these steps:

1. **Extract Audio** (20%) - Extract audio track from video using ffmpeg
2. **Transcribe** (40%) - Convert speech to text using Whisper
3. **Translate** (60%) - Translate text to Spanish using LibreTranslate
4. **Generate Speech** (80%) - Create Spanish audio using TTS
5. **Merge Audio** (100%) - Replace original audio with dubbed audio

## Troubleshooting

### Services won't start

**Check if ports are already in use:**
```bash
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

**Stop conflicting services:**
```bash
docker-compose down
```

### Database connection errors

**Reset the database:**
```bash
docker-compose down -v
docker-compose up -d postgres redis
cd packages/backend
npm run db:push
cd ../..
```

### "Module not found" errors

**Reinstall dependencies:**
```bash
rm -rf node_modules packages/*/node_modules
npm install
```

### Worker not processing jobs

**Check Redis connection:**
```bash
docker-compose logs redis
```

**Restart worker:**
```bash
# Stop all services (Ctrl+C)
# Then restart
npm run dev
```

## Development Commands

### Start services
```bash
npm run dev              # Start all services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run dev:workers      # Workers only
```

### Database management
```bash
cd packages/backend
npm run prisma:studio    # Open database GUI
npm run db:push          # Push schema changes
npm run db:reset         # Reset database
```

### Docker management
```bash
docker-compose up -d postgres redis    # Start DB and Redis
docker-compose down                    # Stop all containers
docker-compose down -v                 # Stop and remove volumes
docker-compose logs postgres           # View logs
```

## File Storage

Videos are stored locally in:
- **Uploads**: `packages/backend/uploads/`
- **Outputs**: `packages/backend/uploads/output/`

Files are automatically cleaned up 24 hours after job completion.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Dubbing
- `POST /api/dub/upload` - Upload video and start job
- `GET /api/dub/status/:jobId` - Get job status
- `GET /api/dub/download/:jobId` - Download result

## Database Schema

### User
- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password
- `createdAt` - Registration timestamp

### DubbingJob
- `id` - Unique identifier
- `userId` - Owner reference
- `status` - pending | processing | completed | failed
- `progress` - 0-100
- `originalFile` - Path to uploaded video
- `outputFile` - Path to dubbed video
- `sourceLanguage` - Source language (default: en)
- `targetLanguage` - Target language (default: es)
- `error` - Error message if failed
- `createdAt` - Job creation timestamp
- `completedAt` - Job completion timestamp
- `expiresAt` - Expiration timestamp (24h after completion)

## Testing the MVP

### Manual Test Flow

1. **Register** a new user with email/password
2. **Upload** a short test video (30 seconds recommended)
3. **Verify** job starts and status shows "processing"
4. **Monitor** progress updates (should reach 100%)
5. **Download** the dubbed video
6. **Play** the video and verify audio is replaced

### Test Video Recommendations

For best results, use a video with:
- Clear speech in English
- Duration: 30-60 seconds
- Format: MP4
- Size: Under 50MB
- Single speaker

## Known Limitations

This is an MVP prototype with intentional limitations:

1. **Language Support**: Only English → Spanish
2. **File Size**: Maximum 100MB
3. **File Format**: Only MP4 supported
4. **Storage**: Local filesystem (not production-ready)
5. **AI Quality**: Using basic models (not production-quality)
6. **Error Handling**: Basic error messages
7. **No Retry Logic**: Failed jobs must be re-uploaded
8. **No Authentication Refresh**: Sessions expire after 24h

## Next Steps

After validating the MVP, consider adding:

1. **Transcript Editing** - Allow users to edit transcripts before dubbing
2. **More Languages** - Support additional language pairs
3. **Better AI Models** - Improve transcription and TTS quality
4. **Cloud Storage** - Use S3 instead of local filesystem
5. **Project Management** - Organize multiple videos into projects
6. **Payment System** - Add subscription tiers
7. **Voice Cloning** - Clone user's voice for dubbing
8. **Lip Sync** - Sync lip movements with new audio

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs: `docker-compose logs`
3. Check backend logs in the terminal
4. Verify all prerequisites are installed

## License

See LICENSE file for details.

---

**Ready to start?** Run `./mvp-start.sh` and visit http://localhost:3000
