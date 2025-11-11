# Cloud Storage and Video Upload System

This document describes the implementation of cloud storage and video upload functionality for the AI Video Dubbing Platform.

## Overview

The system provides secure video upload, storage, and management capabilities using AWS S3 (or S3-compatible services) with the following features:

- Secure file storage with encryption at rest
- Signed URLs for temporary file access
- Video validation (format, duration, audio track)
- Real-time upload progress via WebSocket
- Automatic audio extraction from video files
- Subscription quota enforcement

## Components

### 1. Storage Service (`src/lib/storage.ts`)

Handles all S3 operations:

- **File Upload**: Upload files with encryption and metadata
- **Signed URLs**: Generate temporary URLs for secure file access (1 hour expiry)
- **File Management**: Delete files, check existence, get metadata
- **Health Check**: Verify S3 connection status

Key functions:
- `uploadFile()` - Upload file to S3 with encryption
- `generateSignedUrl()` - Create temporary download URL
- `generateUploadSignedUrl()` - Create temporary upload URL
- `deleteFile()` - Remove file from storage
- `fileExists()` - Check if file exists
- `getFileMetadata()` - Get file information

### 2. Video Validator (`src/lib/video-validator.ts`)

Validates uploaded videos:

- **Format Validation**: Only MP4 and MOV allowed
- **Duration Check**: Maximum 5 minutes for MVP
- **File Size**: Maximum 500 MB
- **Audio Track**: Ensures video has audio
- **Metadata Extraction**: Gets video properties (resolution, codec, fps, etc.)
- **Audio Extraction**: Extracts audio track as 16kHz PCM WAV

### 3. WebSocket Manager (`src/lib/websocket.ts`)

Provides real-time progress updates:

- **Authentication**: JWT-based WebSocket authentication
- **Progress Updates**: Upload and processing progress (0-100%)
- **Error Notifications**: Real-time error messages
- **Completion Alerts**: Success notifications

Connection URL: `ws://localhost:3001/ws?token=JWT_TOKEN&projectId=PROJECT_ID`

### 4. Project Routes (`src/routes/projects.ts`)

RESTful API endpoints for project management:

#### Endpoints

**GET /api/projects**
- List all user's projects
- Returns project metadata without signed URLs

**POST /api/projects**
- Create new project
- Required: name, sourceLanguage, targetLanguage

**GET /api/projects/:id**
- Get project details with signed URLs for media files
- Includes transcripts, translations, and job history

**PUT /api/projects/:id**
- Update project configuration
- Can update name, languages, voice config

**DELETE /api/projects/:id**
- Delete project and all associated files
- Cascades to transcripts, translations, jobs

**POST /api/projects/:id/upload**
- Upload video file (multipart/form-data)
- Validates video format and duration
- Checks subscription quota
- Extracts audio track
- Uploads both video and audio to S3
- Creates initial STT job
- Sends real-time progress via WebSocket

**GET /api/projects/:id/status**
- Get current processing status
- Returns current stage, progress, and job history

## Configuration

### Environment Variables

Add to `.env`:

```bash
# S3/Object Storage Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=dubbing-platform-storage

# Optional: For local development with LocalStack or MinIO
S3_ENDPOINT=http://localhost:4566
```

### Dependencies

New packages installed:
- `@aws-sdk/client-s3` - AWS S3 client
- `@aws-sdk/s3-request-presigner` - Signed URL generation
- `multer` - File upload handling
- `fluent-ffmpeg` - Video processing
- `ws` - WebSocket server

## Usage Examples

### 1. Create Project

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Video Project",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'
```

### 2. Upload Video

```bash
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/video.mp4"
```

### 3. Connect WebSocket for Progress

```javascript
const ws = new WebSocket('ws://localhost:3001/ws?token=JWT_TOKEN&projectId=PROJECT_ID');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
  // { type: 'upload_progress', projectId: '...', progress: 50, message: '...' }
};
```

### 4. Get Project Status

```bash
curl http://localhost:3001/api/projects/PROJECT_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Video Upload Flow

1. **Client uploads video** → POST /api/projects/:id/upload
2. **Server validates** → Format, duration, file size, audio track
3. **Check quota** → Verify user has enough processing minutes
4. **Upload to S3** → Store video with encryption
5. **Extract audio** → Use FFmpeg to extract 16kHz WAV
6. **Upload audio** → Store extracted audio in S3
7. **Update database** → Save video/audio URLs, duration
8. **Create STT job** → Initialize processing pipeline
9. **Send completion** → WebSocket notification

## Storage Structure

Files are organized in S3 with the following structure:

```
videos/{userId}/{projectId}/{timestamp}-{random}-{filename}
audio/{userId}/{projectId}/{timestamp}-{random}-{filename}
thumbnails/{userId}/{projectId}/{timestamp}-{random}-{filename}
voice-samples/{userId}/{projectId}/{timestamp}-{random}-{filename}
```

## Security Features

1. **Encryption at Rest**: All files encrypted with AES256
2. **Signed URLs**: Temporary access (1 hour expiry)
3. **JWT Authentication**: Required for all endpoints
4. **User Isolation**: Files organized by userId
5. **Quota Enforcement**: Prevents abuse
6. **File Validation**: Only allowed formats accepted

## Lifecycle Management

Files are tagged for automatic deletion after 30 days. This is configured via S3 lifecycle policies (not implemented in code, must be set up in AWS console or via IaC).

## Local Development

For local development, you can use:

1. **LocalStack**: AWS service emulator
   ```bash
   docker run -p 4566:4566 localstack/localstack
   ```

2. **MinIO**: S3-compatible object storage
   ```bash
   docker run -p 9000:9000 minio/minio server /data
   ```

Set `S3_ENDPOINT=http://localhost:4566` (or 9000 for MinIO) in your `.env` file.

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 1.1**: Accept MP4 and MOV formats up to 5 minutes
- **Requirement 1.2**: Store files in secure cloud object storage
- **Requirement 1.3**: Extract audio track from video
- **Requirement 1.5**: Display upload progress to user

## Next Steps

The following features are planned for future implementation:

1. Chunked upload for large files (>500MB)
2. Resume interrupted uploads
3. Thumbnail generation
4. Video preview generation
5. Batch file operations
6. S3 lifecycle policy automation
