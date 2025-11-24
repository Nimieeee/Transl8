# Transl8 Video Dubbing Pipeline

## Complete Architecture Overview

```
User → Frontend → Backend API → Job Queue → Workers → Supabase Storage
                      ↓                         ↓
                  Supabase DB              AI Services
                                        (OpenAI, Mistral)
```

## Detailed Pipeline Flow

### 1. **User Interaction (Frontend)**
**Location**: `packages/frontend/src/app/`

**Flow**:
1. User visits landing page → Clicks "Get Started"
2. Dashboard shows all projects
3. User clicks "New Project" → Fills form:
   - Project name
   - Source language (e.g., English)
   - Target language (e.g., Spanish)
4. User uploads video file
5. **Upload automatically triggers dubbing pipeline**

**Files**:
- `page.tsx` - Landing page
- `dashboard/page.tsx` - Project list
- `projects/[id]/page.tsx` - Project detail & upload

---

### 2. **Backend API (Express.js)**
**Location**: `packages/backend/src/`

**Endpoints**:
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/upload` - Upload video & auto-start dubbing
- `POST /api/dub/start` - Manually start dubbing (not used anymore)
- `GET /api/dub/status/:projectId` - Check dubbing status

**Upload Flow** (`routes/projects.ts`):
```typescript
1. Receive video file
2. Upload to Supabase Storage (bucket: 'videos')
3. Update project: status = 'PROCESSING'
4. Add STT job to queue
5. Return success response
```

---

### 3. **Job Queue (BullMQ + Redis)**
**Location**: `packages/backend/src/lib/queue.ts` & `packages/workers/src/lib/queue.ts`

**Queues**:
- `stt` - Speech-to-Text queue
- `translation` - Translation queue
- `tts` - Text-to-Speech queue
- `muxing` - Video muxing queue

**How it works**:
- Jobs are added to Redis queue
- Workers pick up jobs and process them
- Each worker triggers the next stage automatically

---

### 4. **Worker Pipeline (4 Stages)**
**Location**: `packages/workers/src/`

All workers run in the same process on Render (free tier optimization).

#### **Stage 1: STT (Speech-to-Text)**
**File**: `stt-worker.ts`

**Process**:
1. Download video from Supabase Storage
2. Extract audio using ffmpeg: `MP4 → MP3`
3. Send audio to OpenAI Whisper API
4. Get transcription with timestamps
5. Save transcript to database
6. Trigger Translation stage

**Input**: Video URL, source language
**Output**: Transcript with timestamps
**AI Service**: OpenAI Whisper (`whisper-1`)

---

#### **Stage 2: Translation**
**File**: `translation-worker.ts`

**Process**:
1. Fetch transcript from database
2. Send to Mistral AI for translation
3. Retry up to 3 times if fails (rate limiting)
4. Validate JSON response
5. Save translation to database
6. Save adaptation metrics
7. Trigger TTS stage

**Input**: Transcript, source/target languages
**Output**: Translated text
**AI Service**: Mistral AI (`mistral-small-latest`)
**Features**:
- Automatic retry with backoff
- Rate limit handling (1 req/sec for free tier)
- Dubbing adaptation (natural flow)

---

#### **Stage 3: TTS (Text-to-Speech)**
**File**: `tts-worker.ts`

**Process**:
1. Fetch translation from database
2. Send to OpenAI TTS API
3. Generate audio file (MP3)
4. Save to temp file
5. Upload to Supabase Storage
6. Update project with audio URL
7. Trigger Muxing stage

**Input**: Translated text
**Output**: Dubbed audio file (MP3)
**AI Service**: OpenAI TTS (`tts-1`, voice: `alloy`)

**Status**: ⚠️ Partially implemented (upload to storage needs completion)

---

#### **Stage 4: Muxing (Video + Audio Combination)**
**File**: `muxing-worker.ts`

**Process**:
1. Fetch original video URL
2. Fetch dubbed audio URL
3. Use ffmpeg to combine:
   - Keep original video track
   - Replace audio track with dubbed audio
4. Upload final video to Supabase Storage
5. Update project: status = 'COMPLETED'

**Input**: Original video URL, dubbed audio URL
**Output**: Final dubbed video
**Tool**: ffmpeg (fluent-ffmpeg)

**Status**: ⚠️ Needs storage upload implementation

---

## Database Schema (Supabase PostgreSQL)

### Main Tables:

**projects**
- `id` (UUID, auto-generated)
- `user_id` (nullable - anonymous access)
- `name` (project name)
- `status` (DRAFT, PROCESSING, COMPLETED, FAILED)
- `source_language`, `target_language`
- `video_url` (original video)
- `audio_url` (dubbed audio)
- `output_video_url` (final result)
- `created_at`, `updated_at` (auto-generated)

**transcripts**
- `id`, `project_id`
- `content` (JSONB - transcript with timestamps)
- `approved` (boolean)

**translations**
- `id`, `project_id`
- `target_language`
- `content` (JSONB - translated text)
- `approved` (boolean)

**jobs**
- `id`, `project_id`
- `stage` (STT, MT, TTS, MUXING)
- `status` (PENDING, PROCESSING, COMPLETED, FAILED)
- `progress` (0-100)
- `error_message`
- `retry_count`

**adaptation_metrics**
- Tracks translation quality and retry attempts

---

## Storage (Supabase Storage)

**Bucket**: `videos` (public)

**Structure**:
```
videos/
  └── projects/
      └── {project-id}/
          ├── video/
          │   └── {original-filename}
          ├── audio/
          │   └── {dubbed-audio}.mp3
          └── output/
              └── {final-video}.mp4
```

---

## Environment Variables

### Backend (Render)
```bash
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=xxx
FRONTEND_URL=https://transl8-frontend.vercel.app
JWT_SECRET=random-secret
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://transl8.onrender.com/api
```

---

## Current Status

### ✅ Working
1. Project creation
2. Video upload to Supabase Storage
3. Automatic pipeline trigger
4. STT worker (with audio extraction)
5. Translation worker (with retry logic)
6. Job queue system
7. Database integration

### ⚠️ Partially Working
1. TTS worker - generates audio but needs storage upload
2. Muxing worker - logic exists but needs storage integration

### 🔧 Needs Setup
1. Redis instance (for job queue)
2. OpenAI API key (for STT & TTS)
3. Mistral API key (for translation)

---

## How to Complete the Pipeline

### 1. Set up Redis
Get a free Redis instance from:
- **Upstash** (recommended): https://upstash.com
- **Redis Cloud**: https://redis.com/try-free

Add to Render environment:
```
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx
```

### 2. Add API Keys
In Render dashboard:
```
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=xxx
```

### 3. Fix Storage Upload in Workers
The TTS and Muxing workers need to upload files to Supabase Storage.
Currently they save to temp files but don't upload.

**Solution**: Copy storage utility to workers package or create shared package.

---

## Performance & Costs

### Free Tier Limits:
- **OpenAI Whisper**: $0.006/minute of audio
- **OpenAI TTS**: $15/1M characters
- **Mistral AI**: 1 request/second (free tier)
- **Supabase**: 500MB storage, 2GB bandwidth
- **Render**: 750 hours/month (free)
- **Vercel**: Unlimited deployments

### Processing Time (estimated):
- 5-minute video:
  - STT: ~30 seconds
  - Translation: ~10 seconds
  - TTS: ~20 seconds
  - Muxing: ~15 seconds
  - **Total**: ~75 seconds

---

## Error Handling

Each worker:
1. Updates job status to PROCESSING
2. Performs work
3. On success: Updates to COMPLETED, triggers next stage
4. On failure: Updates to FAILED, logs error
5. Cleans up temp files

Translation worker has special retry logic for rate limits.

---

## Monitoring

Check logs in Render dashboard to see:
- Job processing status
- API call results
- Error messages
- Processing times

Each stage logs:
- Start of processing
- Progress updates
- Completion or failure
- Next stage trigger

---

## Next Steps to Full Functionality

1. **Set up Redis** - Enable job queue
2. **Add API keys** - Enable AI processing
3. **Fix storage uploads** - Complete TTS & Muxing
4. **Test end-to-end** - Upload a video and verify complete pipeline
5. **Add progress tracking** - Show real-time progress in frontend
6. **Add error recovery** - Retry failed jobs
7. **Optimize costs** - Batch processing, caching

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐
│  Vercel (Next)  │
│   Frontend      │
└──────┬──────────┘
       │ API Calls
       ▼
┌─────────────────┐      ┌──────────────┐
│  Render (Node)  │◄────►│  Supabase    │
│   Backend API   │      │  PostgreSQL  │
└──────┬──────────┘      └──────────────┘
       │                        ▲
       │ Add Jobs               │ Store Data
       ▼                        │
┌─────────────────┐             │
│  Redis (Queue)  │             │
└──────┬──────────┘             │
       │                        │
       │ Process Jobs           │
       ▼                        │
┌─────────────────┐             │
│  Render (Node)  │─────────────┘
│   4 Workers     │
│  - STT          │◄────► OpenAI Whisper
│  - Translation  │◄────► Mistral AI
│  - TTS          │◄────► OpenAI TTS
│  - Muxing       │
└─────────────────┘
       │
       │ Upload Files
       ▼
┌─────────────────┐
│  Supabase       │
│  Storage        │
│  (videos bucket)│
└─────────────────┘
```
