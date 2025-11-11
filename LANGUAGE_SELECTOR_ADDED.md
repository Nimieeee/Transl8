# Language Selector Added to Frontend

## Changes Made

### File: `packages/frontend/src/components/upload/video-upload.tsx`

Added a language selector dropdown that allows users to choose their target translation language.

## Features

### Supported Languages
- 🇪🇸 Spanish (es) - Default
- 🇫🇷 French (fr)
- 🇵🇹 Portuguese (pt)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇰🇪 Swahili (sw)

### UI/UX
- Clean dropdown with flag emojis for visual identification
- Appears after file selection, before upload
- Default selection: Spanish
- Upload button shows selected language: "Upload & Translate to Spanish"
- Helper text explains the purpose

### Implementation Details

1. **State Management**
   ```typescript
   const [targetLanguage, setTargetLanguage] = useState('es');
   ```

2. **Language Options**
   ```typescript
   const SUPPORTED_LANGUAGES = [
     { code: 'es', name: 'Spanish', flag: '🇪🇸' },
     { code: 'fr', name: 'French', flag: '🇫🇷' },
     // ... more languages
   ];
   ```

3. **API Integration**
   - Sends `targetLanguage` parameter to backend
   - Backend already configured to accept this parameter
   - Works with existing `/api/projects/:id/upload` endpoint

## User Flow

1. User selects video file (drag & drop or browse)
2. File validation runs automatically
3. **Language selector appears** with dropdown
4. User selects target language
5. User clicks "Upload & Translate to [Language]"
6. Video uploads and dubbing pipeline starts

## Backend Integration

The backend route `/api/dub` already supports the `targetLanguage` parameter:

```typescript
const targetLanguage = req.body.targetLanguage || 'es';
```

No backend changes needed!

## Testing

1. Start the frontend: `cd packages/frontend && npm run dev`
2. Navigate to project upload page
3. Select a video file
4. Choose target language from dropdown
5. Upload and verify language is passed to backend

## Future Enhancements

- Add more languages as translation models support them
- Show estimated processing time per language
- Add language-specific voice selection
- Support custom language pairs (not just English source)
