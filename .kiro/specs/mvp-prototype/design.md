# MVP Prototype Design

## Overview

This design outlines a minimal viable prototype for the AI video dubbing platform. The architecture is intentionally simplified to enable rapid development and testing, with the ability to evolve as we learn from real usage.

## Architecture

### High-Level Flow

```
User → Frontend (Next.js) → Backend API (Express) → Worker (BullMQ) → AI Services → Output
```

### Simplified Stack

- **Frontend**: Next.js with basic UI components
- **Backend**: Express.js API server
- **Database**: PostgreSQL (minimal schema)
- **Queue**: BullMQ with Redis
- **Storage**: Local filesystem (for MVP)
- **AI Services**: Use existing adapters with mock fallbacks

## Components and Interfaces

### 1. Frontend Application

**Pages:**
- `/login` - Simple login form
- `/register` - Simple registration form
- `/upload` - Video upload with language selection
- `/status/:jobId` - Job progress tracking
- `/download/:jobId` - Download completed video

**Key Components:**
- `VideoUploadForm` - File input + language selector
- `JobStatus` - Progress indicator with status updates
- `DownloadButton` - Simple download link

### 2. Backend API

**Endpoints:**

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

POST /api/dub/upload        # Upload video + start job
GET  /api/dub/status/:jobId # Get job status
GET  /api/dub/download/:jobId # Download result
```

**Core Services:**
- `authService` - Basic JWT authentication
- `uploadService` - Handle file uploads
- `dubbingService` - Orchestrate dubbing pipeline
- `storageService` - File storage operations

### 3. Worker Process

**Single Worker Type:**
- `dubbing-worker` - Processes entire dubbing pipeline

**Pipeline Steps:**
1. Extract audio from video (ffmpeg)
2. Transcribe audio (Whisper adapter)
3. Translate text (simple translation API or mock)
4. Generate speech (TTS adapter or mock)
5. Merge audio with video (ffmpeg)
6. Update job status

### 4. AI Service Integration

**Simplified Approach:**
- Use existing adapters where available
- Use simple API calls for translation
- Focus on one language pair: English → Spanish

**Services:**
- STT: Whisper adapter (if available, otherwise mock)
- Translation: LibreTranslate API (free, open-source)
- TTS: Basic TTS adapter (if available, otherwise mock)

**LibreTranslate Setup:**
- Public API: https://libretranslate.com (free tier available)
- Or self-hosted: `docker run -ti --rm -p 5000:5000 libretranslate/libretranslate`
- Simple REST API: POST /translate with {q, source, target}

## Data Models

### Minimal Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  createdAt DateTime @default(now())
  jobs      DubbingJob[]
}

model DubbingJob {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  status          String   // pending, processing, completed, failed
  progress        Int      @default(0) // 0-100
  
  originalFile    String   // path to uploaded video
  outputFile      String?  // path to dubbed video
  
  sourceLanguage  String   @default("en")
  targetLanguage  String   @default("es")
  
  error           String?
  
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  expiresAt       DateTime? // 24 hours after completion
}
```

## Error Handling

**Simplified Approach:**
- Basic try-catch blocks
- Log errors to console
- Return user-friendly error messages
- Failed jobs marked as "failed" with error message

**No Advanced Features:**
- No retry logic (for MVP)
- No dead letter queue
- No detailed error tracking

## Testing Strategy

**Manual Testing Focus:**
1. Register a new user
2. Upload a small test video
3. Verify job starts processing
4. Check status updates
5. Download completed video
6. Verify audio is replaced

**Automated Testing:**
- Skip for MVP (add later based on needs)

## Implementation Notes

### What We're Reusing

From the existing codebase, we can reuse:
- Database setup (Prisma)
- Basic auth middleware
- Queue infrastructure (BullMQ)
- Existing AI adapters (if they work)

### What We're Simplifying

- No project management - just direct job creation
- No transcript editing - automatic pipeline only
- No user settings - hardcoded defaults
- No subscription checks - open access
- No advanced storage - local filesystem
- No websockets - simple polling for status

### What We're Mocking

If AI services aren't ready:
- Mock transcription (return dummy text)
- Mock translation (return dummy translation)
- Mock TTS (use simple TTS or return silence)
- Focus on the pipeline flow, not AI quality

## Deployment

**MVP Deployment:**
- Single server running all components
- Docker Compose for local development
- No Kubernetes (too complex for MVP)
- No CI/CD (manual deployment)

## Success Criteria

The MVP is successful if:
1. A user can register and log in
2. A user can upload a video
3. The system processes it end-to-end
4. The user can download a result
5. The entire flow takes < 5 minutes for a 1-minute video

## Next Steps After MVP

Based on testing, prioritize:
1. Improve AI quality (better models)
2. Add transcript editing
3. Support more languages
4. Add project management
5. Implement proper storage (S3)
6. Add payment system
