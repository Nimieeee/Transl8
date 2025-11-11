# Voice Management System

This document describes the voice management system implementation for the AI Video Dubbing Platform.

## Overview

The voice management system provides endpoints for managing preset voices and user-created voice clones. It supports:
- Listing preset voices organized by language and style
- Creating voice clones from audio samples
- Managing voice clone slots based on subscription tiers
- Deleting voice clones

## Requirements Addressed

- **8.1**: Display available preset voices for target language selection
- **8.2**: Show preset voice options with audio previews
- **8.3**: Accept audio sample upload for voice cloning
- **8.4**: Generate voice clone using XTTS-v2
- **8.5**: Store voice configurations and allow reuse across projects
- **12.5**: Enforce voice clone slot limits based on subscription tier
- **15.4**: Validate audio quality and duration before accepting

## API Endpoints

### 1. GET /api/voices

List available preset voices organized by language and style.

**Authentication**: Required

**Query Parameters**:
- `language` (optional): Filter by language code (e.g., "en", "es", "fr")

**Response**:
```json
{
  "voices": {
    "en": [
      {
        "id": "en/male-neutral",
        "name": "male-neutral",
        "language": "en",
        "gender": "male",
        "style": "neutral",
        "sampleUrl": "/api/voices/samples/en-male-neutral"
      },
      {
        "id": "en/female-conversational",
        "name": "female-conversational",
        "language": "en",
        "gender": "female",
        "style": "conversational",
        "sampleUrl": "/api/voices/samples/en-female-conversational"
      }
    ],
    "es": [...]
  },
  "message": "Preset voices retrieved successfully"
}
```

### 2. GET /api/voices/samples/:voiceId

Get audio sample preview for a preset voice.

**Authentication**: Required

**Parameters**:
- `voiceId`: Voice identifier with format `{language}-{name}` (e.g., "en-male-neutral")

**Response**: WAV audio file (cached for 24 hours)

### 3. POST /api/voices/clone

Create a voice clone from an audio sample.

**Authentication**: Required

**Request**: multipart/form-data
- `audio` (file): Audio file (WAV or MP3, minimum 6 seconds)
- `name` (string): Name for the voice clone
- `language` (string, optional): Language code (default: "en")

**Validation**:
- Audio duration must be at least 6 seconds
- User must have available voice clone slots
- Audio file must be valid WAV or MP3 format

**Response**:
```json
{
  "voiceClone": {
    "id": "uuid",
    "name": "My Voice",
    "language": "en",
    "voiceId": "clone_1234567890_abc123",
    "quality": 0.85,
    "duration": 8.5,
    "createdAt": "2025-11-03T12:00:00Z"
  },
  "message": "Voice clone created successfully"
}
```

**Error Responses**:
- `400`: Audio sample too short or invalid format
- `403`: Voice clone slot limit reached
- `404`: User not found
- `500`: Voice clone creation failed

### 4. GET /api/voices/clones

List user's voice clones with slot usage information.

**Authentication**: Required

**Response**:
```json
{
  "voiceClones": [
    {
      "id": "uuid",
      "name": "My Voice",
      "language": "en",
      "voiceId": "clone_1234567890_abc123",
      "quality": 0.85,
      "duration": 8.5,
      "createdAt": "2025-11-03T12:00:00Z"
    }
  ],
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2
  },
  "subscriptionTier": "CREATOR"
}
```

### 5. DELETE /api/voices/clones/:id

Delete a voice clone.

**Authentication**: Required

**Parameters**:
- `id`: Voice clone UUID

**Response**:
```json
{
  "message": "Voice clone deleted successfully"
}
```

**Error Responses**:
- `403`: Unauthorized (not the owner)
- `404`: Voice clone not found
- `500`: Deletion failed

## Voice Clone Slot Limits

Voice clone slots are enforced based on subscription tier:

| Tier | Voice Clone Slots |
|------|-------------------|
| FREE | 0 |
| CREATOR | 3 |
| PRO | 10 |
| ENTERPRISE | Unlimited (999) |

## Audio Quality Validation

When creating a voice clone, the system validates:

1. **Duration**: Minimum 6 seconds required
2. **Format**: WAV or MP3 files only
3. **File Size**: Maximum 50MB
4. **Quality Score**: Calculated based on duration and audio properties
   - 6-10 seconds: 0.7-0.9 quality score
   - 10+ seconds: 0.9 quality score

## Integration with TTS Pipeline

Voice clones are used in the TTS stage of the dubbing pipeline:

1. User selects or creates voice clones
2. Voice configuration is stored in project settings
3. TTS worker uses XTTS-v2 adapter to synthesize audio with cloned voices
4. Multi-speaker content can use different voice clones per speaker

## Database Schema

Voice clones are stored in the `voice_clones` table:

```sql
CREATE TABLE voice_clones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  sample_audio_url TEXT,
  model_data JSONB,  -- Contains voiceId and duration
  language VARCHAR(10),
  quality FLOAT,
  created_at TIMESTAMP
);
```

## Implementation Details

### Adapters

- **StyleTTSAdapter**: Handles preset voice synthesis
- **XTTSAdapter**: Handles voice cloning and cloned voice synthesis

### File Upload

- Uses `multer` for multipart file uploads
- Temporary files stored in system temp directory
- Files cleaned up after processing
- In production, audio samples should be uploaded to S3/GCS

### Security

- All endpoints require authentication
- User can only access their own voice clones
- File type validation prevents malicious uploads
- Rate limiting applied via middleware

## Future Enhancements

1. **Advanced Quality Analysis**: Use audio analysis libraries to assess sample quality
2. **Voice Preview**: Generate preview samples before committing to voice clone
3. **Voice Sharing**: Allow users to share voice clones with team members
4. **Voice Marketplace**: Public library of community-contributed voices
5. **Voice Editing**: Adjust voice characteristics (pitch, speed, emotion)
6. **Batch Voice Cloning**: Create multiple clones from a single audio file

## Testing

To test the voice management endpoints:

1. Start the backend server
2. Authenticate and get a JWT token
3. Test preset voice listing:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/voices
   ```
4. Test voice cloning:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -F "audio=@sample.wav" \
     -F "name=My Voice" \
     -F "language=en" \
     http://localhost:3001/api/voices/clone
   ```
5. Test voice clone listing:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/voices/clones
   ```

## Related Documentation

- [TTS Implementation Summary](TTS_IMPLEMENTATION_SUMMARY.md)
- [Project Management API](PROJECT_MANAGEMENT_API.md)
- [Authentication](AUTH_README.md)
