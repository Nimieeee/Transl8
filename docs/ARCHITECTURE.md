# Architecture Overview

## Monorepo Structure

The AI Video Dubbing Platform uses a monorepo architecture with npm workspaces:

```
ai-video-dubbing-platform/
├── packages/
│   ├── backend/          # Express.js API server
│   ├── frontend/         # Next.js web application  
│   ├── workers/          # Background job processors
│   └── shared/           # Shared TypeScript types
├── .github/              # CI/CD workflows
├── .kiro/                # Project specifications
├── docs/                 # Documentation
└── scripts/              # Setup and utility scripts
```

## Package Details

### Backend (@dubbing/backend)

**Technology Stack:**
- Node.js with Express.js
- TypeScript
- Prisma ORM
- BullMQ for job queue
- JWT authentication

**Responsibilities:**
- REST API endpoints
- User authentication and authorization
- Project management
- Job orchestration
- WebSocket for real-time updates

### Frontend (@dubbing/frontend)

**Technology Stack:**
- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- React Query for state management

**Responsibilities:**
- User interface
- Video upload and management
- Transcript/translation editing
- Real-time progress tracking
- Voice management

### Workers (@dubbing/workers)

**Technology Stack:**
- Node.js/Python
- BullMQ workers
- FFmpeg for video processing
- Model adapters for AI services

**Responsibilities:**
- STT processing (Whisper + pyannote)
- Machine translation (Marian NMT)
- TTS generation (StyleTTS 2, XTTS-v2)
- Lip-sync processing (Wav2Lip)
- Video muxing

### Shared (@dubbing/shared)

**Purpose:**
- Common TypeScript types and interfaces
- Shared utilities
- Type safety across packages

## Infrastructure Services

### PostgreSQL
- User data
- Projects and jobs
- Transcripts and translations
- Voice clones

### Redis
- Session storage
- Job queue (BullMQ)
- Caching

### MinIO/S3
- Video storage
- Audio files
- Generated outputs

## Development Workflow

1. **Local Development**: All services run locally with hot-reload
2. **Docker Services**: Infrastructure runs in Docker containers
3. **Code Quality**: ESLint, Prettier, TypeScript strict mode
4. **CI/CD**: GitHub Actions for automated testing and deployment

## Configuration Management

- Root `.env` for global settings
- Package-specific `.env` files
- Environment-specific overrides
- Secrets management for production

## Security Considerations

- JWT-based authentication
- Password hashing with bcrypt
- HTTPS/TLS in production
- Input validation with Zod
- Rate limiting
- CORS configuration

## Scalability

- Horizontal scaling of workers
- Database connection pooling
- Redis clustering for high availability
- CDN for static assets
- GPU autoscaling for model inference

## Monitoring and Observability

- Structured logging (Winston)
- Error tracking (Sentry)
- Performance monitoring (DataDog)
- Health check endpoints
- Metrics collection
