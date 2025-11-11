# Transcript and Translation Editing API

This document describes the API endpoints for editing transcripts and translations in the video dubbing pipeline.

## Overview

The transcript and translation editing features allow users to review and modify the output of the STT (Speech-to-Text) and MT (Machine Translation) stages before proceeding to voice generation. This human-in-the-loop approach ensures quality and accuracy.

## Endpoints

### Transcript Management

#### GET /api/projects/:id/transcript

Retrieve the transcript for a project.

**Authentication:** Required

**Response:**
```json
{
  "transcriptId": "uuid",
  "projectId": "uuid",
  "content": {
    "text": "Full transcript text",
    "duration": 125.5,
    "language": "en",
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 3.5,
        "text": "Hello everyone",
        "speaker": "SPEAKER_00",
        "confidence": 0.95,
        "words": [...]
      }
    ],
    "speakerCount": 2
  },
  "approved": false,
  "confidence": 0.92,
  "speakerCount": 2,
  "hasEdits": false,
  "createdAt": "2025-11-03T...",
  "updatedAt": "2025-11-03T..."
}
```

#### PUT /api/projects/:id/transcript

Update the transcript with user edits. Timestamps are preserved.

**Authentication:** Required

**Request Body:**
```json
{
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Hello everyone, welcome",
      "speaker": "SPEAKER_00",
      "confidence": 0.95,
      "words": [...]
    }
  ],
  "text": "Optional full text override"
}
```

**Response:**
```json
{
  "transcriptId": "uuid",
  "projectId": "uuid",
  "content": {...},
  "approved": false,
  "message": "Transcript updated successfully"
}
```

### Translation Management

#### GET /api/projects/:id/translation

Retrieve the translation for a project, including source text for side-by-side comparison.

**Authentication:** Required

**Response:**
```json
{
  "translationId": "uuid",
  "projectId": "uuid",
  "targetLanguage": "es",
  "content": {
    "text": "Translated text",
    "duration": 125.5,
    "language": "es",
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 3.5,
        "text": "Hola a todos",
        "sourceText": "Hello everyone",
        "speaker": "SPEAKER_00"
      }
    ]
  },
  "sourceContent": {...},
  "approved": false,
  "glossaryApplied": true,
  "hasEdits": false,
  "createdAt": "2025-11-03T...",
  "updatedAt": "2025-11-03T..."
}
```

#### PUT /api/projects/:id/translation

Update the translation with user edits. Timestamps and source text are preserved.

**Authentication:** Required

**Request Body:**
```json
{
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Hola a todos, bienvenidos",
      "sourceText": "Hello everyone, welcome",
      "speaker": "SPEAKER_00"
    }
  ],
  "text": "Optional full text override"
}
```

**Response:**
```json
{
  "translationId": "uuid",
  "projectId": "uuid",
  "content": {...},
  "approved": false,
  "message": "Translation updated successfully"
}
```

### Stage Approval Workflow

#### POST /api/projects/:id/approve-stage

Approve a completed stage and trigger the next stage in the pipeline.

**Authentication:** Required

**Request Body:**
```json
{
  "stage": "STT" | "MT"
}
```

**Response (STT approval):**
```json
{
  "message": "Transcript approved. Translation stage started.",
  "stage": "STT",
  "nextStage": "MT",
  "transcriptId": "uuid",
  "jobId": "uuid"
}
```

**Response (MT approval):**
```json
{
  "message": "Translation approved. Voice generation stage started.",
  "stage": "MT",
  "nextStage": "TTS",
  "translationId": "uuid",
  "jobId": "uuid"
}
```

**Error Cases:**
- 400: Stage not complete or already approved
- 400: Voice configuration missing (for MT approval)
- 404: Project or stage data not found

## Workflow

1. **STT Stage Completion**
   - User uploads video
   - STT processing completes
   - Project status changes to `REVIEW`
   - User can GET transcript and optionally PUT edits
   - User POSTs to approve-stage with `stage: "STT"`
   - MT stage begins automatically

2. **MT Stage Completion**
   - MT processing completes
   - Project status changes to `REVIEW`
   - User can GET translation and optionally PUT edits
   - User must configure voices if not already done
   - User POSTs to approve-stage with `stage: "MT"`
   - TTS stage begins automatically

3. **Preventing Re-processing**
   - Once a stage is approved, it cannot be re-approved
   - Edits can be made before approval
   - After approval, the edited content is used for subsequent stages

## Implementation Details

### Timestamp Preservation

When editing transcripts or translations, the system preserves:
- Segment start/end times
- Word-level timings (for transcripts)
- Speaker labels
- Original confidence scores (unless overridden)

### Speaker Count Calculation

The system automatically calculates the number of unique speakers from the segments when updating transcripts.

### Validation

- Segments must include required fields (id, start, end, text)
- Timestamps must be valid numbers
- Speaker labels are preserved or defaulted to "SPEAKER_00"
- Word confidence values default to 1.0 if not provided

## Requirements Satisfied

- **Requirement 9.1**: Transcript display in editable interface with timestamps
- **Requirement 9.2**: Timestamp alignment preserved during edits
- **Requirement 9.3**: Side-by-side source and target text display
- **Requirement 9.4**: Segment-by-segment editing support
- **Requirement 9.5**: Stage approval workflow with pipeline progression
- **Requirement 6.3**: Automatic stage transitions after approval
