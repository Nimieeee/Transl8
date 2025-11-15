# Video Dubbing Platform - Simple Version

A clean, minimal video dubbing platform with backend, workers, and frontend.

## Architecture

- **Backend**: Express.js API with authentication, project management, and job orchestration
- **Workers**: BullMQ workers for STT, translation, TTS, and muxing
- **Frontend**: Next.js app with authentication and project dashboard
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis with BullMQ

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- FFmpeg

## Quick Start

1. **Setup environment**:
```bash
chmod +x START_SIMPLE.sh
./START_SIMPLE.sh
```

2. **Configure environment variables**:
Edit the `.env` files in each package with your credentials:
- `packages/backend/.env`
- `packages/workers/.env`
- `packages/frontend/.env`

3. **Start services** (in separate terminals):

```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Workers
cd packages/workers
npm run dev

# Terminal 3 - Frontend
cd packages/frontend
npm run dev
```

4. **Access the app**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Project Structure

```
packages/
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── lib/           # Core logic
│   │   └── middleware/    # Auth, error handling
│   └── prisma/            # Database schema
├── workers/
│   └── src/
│       ├── stt-worker.ts
│       ├── translation-worker.ts
│       ├── tts-worker.ts
│       └── muxing-worker.ts
└── frontend/
    └── src/
        ├── app/           # Next.js pages
        └── lib/           # API client
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `POST /api/projects/:id/upload` - Upload video

### Dubbing
- `POST /api/dub/start` - Start dubbing process
- `GET /api/dub/status/:projectId` - Get status

## Pipeline Flow

1. **Upload**: User uploads video
2. **STT**: Speech-to-text extraction
3. **Translation**: Translate transcript
4. **TTS**: Generate dubbed audio
5. **Muxing**: Combine video with new audio
6. **Complete**: Download result

## Development

```bash
# Backend
cd packages/backend
npm run dev          # Start dev server
npm run build        # Build for production
npm run prisma:studio # Open database GUI

# Workers
cd packages/workers
npm run dev          # Start workers
npm run build        # Build for production

# Frontend
cd packages/frontend
npm run dev          # Start dev server
npm run build        # Build for production
```

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API key
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `S3_BUCKET` - S3 bucket name

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Troubleshooting

**Database connection failed**:
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env

**Redis connection failed**:
- Ensure Redis is running
- Check REDIS_HOST and REDIS_PORT

**Workers not processing**:
- Check Redis connection
- Verify OPENAI_API_KEY is set
- Check worker logs

## Production Deployment

1. Build all packages:
```bash
cd packages/backend && npm run build
cd packages/workers && npm run build
cd packages/frontend && npm run build
```

2. Set production environment variables

3. Run migrations:
```bash
cd packages/backend && npx prisma migrate deploy
```

4. Start services:
```bash
cd packages/backend && npm start
cd packages/workers && npm start
cd packages/frontend && npm start
```

## License

MIT
