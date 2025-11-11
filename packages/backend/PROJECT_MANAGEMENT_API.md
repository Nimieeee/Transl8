# Project Management API Implementation

This document describes the implementation of the Project Management API endpoints for the AI Video Dubbing Platform.

## Overview

The Project Management API provides comprehensive CRUD operations, status tracking, and configuration management for video dubbing projects. All endpoints require authentication via JWT token.

## Implemented Endpoints

### 1. Get Supported Languages
**GET** `/api/projects/supported-languages`

Returns the list of supported languages for source and target language selection.

**Response:**
```json
{
  "languages": ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
  "languageNames": {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese"
  }
}
```

### 2. List User Projects
**GET** `/api/projects`

Lists all projects belonging to the authenticated user, ordered by creation date (newest first).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Video Project",
      "status": "PROCESSING",
      "sourceLanguage": "en",
      "targetLanguage": "es",
      "duration": 180,
      "thumbnailUrl": "https://...",
      "createdAt": "2025-11-03T10:00:00Z",
      "updatedAt": "2025-11-03T10:05:00Z"
    }
  ]
}
```

### 3. Create New Project
**POST** `/api/projects`

Creates a new video dubbing project.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "My Video Project",
  "sourceLanguage": "en",
  "targetLanguage": "es"
}
```

**Validation:**
- `name`: Required, 1-255 characters
- `sourceLanguage`: Required, 2-character language code, must be supported
- `targetLanguage`: Required, 2-character language code, must be supported
- Source and target languages must be different

**Response:** `201 Created`
```json
{
  "project": {
    "id": "uuid",
    "userId": "uuid",
    "name": "My Video Project",
    "status": "UPLOADING",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "createdAt": "2025-11-03T10:00:00Z",
    "updatedAt": "2025-11-03T10:00:00Z"
  }
}
```

### 4. Get Project Details
**GET** `/api/projects/:id`

Retrieves detailed information about a specific project, including transcripts, translations, and job history.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "userId": "uuid",
    "name": "My Video Project",
    "status": "PROCESSING",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "videoUrl": "https://signed-url...",
    "audioUrl": "https://signed-url...",
    "outputVideoUrl": "https://signed-url...",
    "duration": 180,
    "thumbnailUrl": "https://...",
    "voiceConfig": {
      "type": "preset",
      "voiceId": "voice-123",
      "parameters": {
        "speed": 1.0,
        "pitch": 0
      }
    },
    "transcripts": [...],
    "translations": [...],
    "jobs": [...],
    "createdAt": "2025-11-03T10:00:00Z",
    "updatedAt": "2025-11-03T10:05:00Z"
  }
}
```

**Note:** Media URLs are pre-signed URLs with temporary access.

### 5. Update Project Configuration
**PUT** `/api/projects/:id`

Updates project configuration including language settings and voice configuration.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "sourceLanguage": "en",
  "targetLanguage": "fr",
  "voiceConfig": {
    "type": "clone",
    "voiceId": "voice-clone-uuid",
    "parameters": {
      "speed": 1.1,
      "pitch": 2,
      "emotion": "neutral",
      "style": "conversational"
    },
    "speakerMapping": {
      "SPEAKER_00": "voice-id-1",
      "SPEAKER_01": "voice-id-2"
    }
  }
}
```

**Validation:**
- All fields are optional
- Language codes must be supported
- Source and target languages must be different
- Voice clones must belong to the authenticated user
- Voice configuration follows strict schema

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "name": "Updated Project Name",
    "sourceLanguage": "en",
    "targetLanguage": "fr",
    "voiceConfig": {...},
    "updatedAt": "2025-11-03T10:10:00Z"
  }
}
```

### 6. Delete Project
**DELETE** `/api/projects/:id`

Deletes a project and all associated resources (files, transcripts, translations, jobs).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Project deleted successfully"
}
```

**Note:** This operation:
- Deletes all files from cloud storage (video, audio, output)
- Cascades deletion to all related database records
- Cannot be undone

### 7. Get Project Status
**GET** `/api/projects/:id/status`

Retrieves detailed processing status including current stage, progress, estimated time, and job history.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "projectId": "uuid",
  "projectName": "My Video Project",
  "status": "PROCESSING",
  "currentStage": "TTS",
  "stageProgress": 45,
  "overallProgress": 62,
  "estimatedTimeRemaining": 120,
  "duration": 180,
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "jobs": [
    {
      "id": "uuid",
      "stage": "STT",
      "status": "COMPLETED",
      "progress": 100,
      "errorMessage": null,
      "startedAt": "2025-11-03T10:01:00Z",
      "completedAt": "2025-11-03T10:02:30Z",
      "createdAt": "2025-11-03T10:01:00Z"
    },
    {
      "id": "uuid",
      "stage": "MT",
      "status": "COMPLETED",
      "progress": 100,
      "errorMessage": null,
      "startedAt": "2025-11-03T10:02:35Z",
      "completedAt": "2025-11-03T10:03:00Z",
      "createdAt": "2025-11-03T10:02:35Z"
    },
    {
      "id": "uuid",
      "stage": "TTS",
      "status": "PROCESSING",
      "progress": 45,
      "errorMessage": null,
      "startedAt": "2025-11-03T10:03:05Z",
      "completedAt": null,
      "createdAt": "2025-11-03T10:03:05Z"
    }
  ],
  "errors": []
}
```

**Progress Calculation:**
- `stageProgress`: Current stage completion (0-100%)
- `overallProgress`: Overall pipeline completion with weighted stages:
  - STT: 20%
  - MT: 15%
  - TTS: 30%
  - MUXING: 10%
  - LIPSYNC: 25%

**Estimated Time:**
- Based on video duration and stage-specific processing rates
- Rough estimates (seconds per minute of video):
  - STT: 30s/min
  - MT: 10s/min
  - TTS: 60s/min
  - MUXING: 5s/min
  - LIPSYNC: 120s/min

### 8. Upload Video
**POST** `/api/projects/:id/upload`

Uploads a video file to the project and initiates processing.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `video`: Video file (MP4 or MOV, max 500MB)

**Response:**
```json
{
  "message": "Video uploaded successfully",
  "project": {
    "id": "uuid",
    "videoUrl": "storage-key",
    "audioUrl": "storage-key",
    "duration": 180,
    "status": "PROCESSING"
  },
  "metadata": {
    "duration": 180.5,
    "format": "mp4",
    "resolution": "1920x1080"
  }
}
```

**WebSocket Progress Events:**
The upload process sends real-time progress updates via WebSocket:
- 10%: Validating video file
- 30%: Uploading video to storage
- 60%: Extracting audio
- 80%: Uploading audio to storage
- 90%: Finalizing
- 100%: Upload complete

### 9. Get Transcript Quality
**GET** `/api/projects/:id/transcript/quality`

Retrieves quality metrics for the project's transcript.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "transcriptId": "uuid",
  "qualityMetrics": {
    "averageConfidence": 0.92,
    "lowConfidenceSegments": 2,
    "totalSegments": 45,
    "speakerCount": 2
  },
  "segmentFlags": [
    {
      "segmentId": 12,
      "reason": "low_confidence",
      "confidence": 0.65
    }
  ],
  "meetsMinimumQuality": true,
  "qualityCheckReason": "All quality checks passed"
}
```

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request data",
  "details": [...]
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient processing quota",
  "details": {
    "videoDuration": 5.5,
    "remainingQuota": 3.2
  }
}
```

**404 Not Found:**
```json
{
  "error": "Project not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create project"
}
```

## Language Validation

The API validates language pairs to ensure:
1. Both source and target languages are supported
2. Source and target languages are different
3. Language codes are valid 2-character ISO codes

Supported languages: `en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `ja`, `ko`, `zh`

## Voice Configuration Schema

Voice configuration supports two types:

**Preset Voice:**
```json
{
  "type": "preset",
  "voiceId": "preset-voice-name",
  "parameters": {
    "speed": 1.0,
    "pitch": 0,
    "emotion": "neutral",
    "style": "conversational"
  }
}
```

**Voice Clone:**
```json
{
  "type": "clone",
  "voiceId": "voice-clone-uuid",
  "parameters": {
    "speed": 1.0,
    "pitch": 0
  },
  "speakerMapping": {
    "SPEAKER_00": "voice-clone-uuid-1",
    "SPEAKER_01": "voice-clone-uuid-2"
  }
}
```

**Parameters:**
- `speed`: 0.5 to 2.0 (default: 1.0)
- `pitch`: -12 to 12 semitones (default: 0)
- `emotion`: Optional emotion tag
- `style`: Optional style tag
- `speakerMapping`: Maps speaker IDs to voice IDs for multi-speaker content

## Security

- All endpoints (except `/supported-languages`) require JWT authentication
- Projects are isolated by user ID
- File access uses pre-signed URLs with expiration
- Input validation prevents injection attacks
- Rate limiting applied per user/IP

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 7.1**: Dashboard displaying all user projects with status
- **Requirement 7.2**: Initialize workspace for video upload and configuration
- **Requirement 7.3**: Display processing stage, progress, and estimated time
- **Requirement 7.4**: Download completed videos and restart processing
- **Requirement 8.1**: Display supported source and target languages
- **Requirement 8.2**: Display available preset voices
- **Requirement 8.5**: Store and reuse voice configurations
- **Requirement 6.2**: Real-time progress updates

## Implementation Notes

1. **Language Validation**: Added comprehensive validation for language pairs with clear error messages
2. **Voice Configuration**: Structured schema with validation for both preset and cloned voices
3. **Progress Tracking**: Enhanced status endpoint with weighted overall progress and time estimates
4. **Error Handling**: Consistent error responses with detailed information
5. **Security**: User isolation, file cleanup, and proper authentication
6. **WebSocket Integration**: Real-time progress updates during upload and processing
