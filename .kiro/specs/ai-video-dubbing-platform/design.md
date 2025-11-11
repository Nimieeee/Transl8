# Design Document

## Overview

The AI Video Dubbing Platform is a production-grade web application that provides superior-quality video localization through a modular, self-hosted AI pipeline. The system processes videos through five core stages: video ingestion, speech-to-text transcription with speaker diarization, machine translation, voice generation with cloning capabilities, and post-processing with lip synchronization.

The architecture prioritizes audio quality, user control, and system adaptability. By self-hosting specialized open-source models and providing human-in-the-loop editing capabilities, the platform delivers professional-grade dubbing that preserves the creator's vocal identity and emotional expression across languages.

## Architecture

### High-Level System Architecture

The platform follows a microservices architecture with clear separation between the web application layer, API layer, processing pipeline, and model inference services.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Application                          │
│                    (React/Next.js Frontend)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         API Gateway                              │
│                    (Node.js/Express Backend)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Service │  │ Project Mgmt │  │ Job Manager  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
┌───────────────▼──┐  ┌──────▼──────┐  ┌▼─────────────────┐
│   PostgreSQL     │  │   Redis     │  │  Object Storage  │
│   (Metadata)     │  │  (Sessions) │  │  (S3/GCS)        │
└──────────────────┘  └─────────────┘  └──────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Job Queue System                            │
│                    (BullMQ/Redis-based)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Processing Pipeline Workers                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ STT Worker   │  │  MT Worker   │  │ TTS Worker   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │ Lip-Sync     │  │ FFmpeg       │  │ Validation   │         │
│  │ Worker       │  │ Worker       │  │ Worker       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Model Inference Layer                         │
│                  (GPU-Accelerated Containers)                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Whisper +        │  │ Marian NMT /     │                    │
│  │ pyannote.audio   │  │ Llama 3.1        │                    │
│  │ (STT + Diarize)  │  │ (Translation)    │                    │
│  └──────────────────┘  └──────────────────┘                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ StyleTTS 2 /     │  │ Wav2Lip +        │                    │
│  │ XTTS-v2          │  │ GFPGAN           │                    │
│  │ (Voice Gen)      │  │ (Lip-Sync)       │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline Flow

```
Video Upload → Audio Extraction → STT (Transcription + Diarization)
                                          ↓
                                   Context Map Creation
                                          ↓
                    ┌─────────────────────┴─────────────────────┐
                    │                                             │
            Vocal Isolation                              Emotion Analysis
         (Demucs + noisereduce)                      (SER Model)
                    │                                             │
                    └─────────────────────┬─────────────────────┘
                                          ↓
                              Clean Style Prompts + Emotion Tags
                                          ↓
                                   User Review/Edit
                                          ↓
                          Intelligent Translation Adaptation
                        (LLM with Few-Shot + Validation Loop)
                                          ↓
                                   User Review/Edit
                                          ↓
                              Voice Generation (OpenVoice)
                          (Using Clean Style Prompts)
                                          ↓
                          Absolute Synchronization Assembly
                        (Silent Base + Conform + Overlay)
                                          ↓
                              Video + Audio Muxing (FFmpeg)
                                          ↓
                              Lip-Sync (Optional/Premium)
                                          ↓
                              Watermark (Free Tier Only)
                                          ↓
                                   Final Video Output
```

### Technology Stack

**Frontend:**
- React with Next.js for server-side rendering and routing
- TypeScript for type safety
- Tailwind CSS for styling
- React Query for state management and API caching
- WebSocket for real-time progress updates

**Backend API:**
- Node.js with Express.js
- TypeScript
- JWT for authentication
- Prisma ORM for database access

**Database:**
- PostgreSQL for relational data (users, projects, jobs, voice clones)
- Redis for session management and caching

**Job Queue:**
- BullMQ (Redis-based) for asynchronous job orchestration
- Separate queues for each pipeline stage

**Processing Workers:**
- Python-based workers for AI model inference
- Node.js workers for FFmpeg operations
- Docker containers for isolation and scalability

**AI Models:**
- Whisper (large-v3) for STT with word-level timestamps
- pyannote.audio 3.0 for speaker diarization
- Gemini Pro for intelligent translation adaptation with timing constraints
- Gemini Flash for fast validation (LLM-as-Judge)
- OpenVoice for zero-shot voice cloning with style transfer
- Wav2vec2-based SER model for emotion recognition
- Wav2Lip for lip synchronization
- GFPGAN for face restoration

**Audio Processing:**
- Demucs for vocal isolation (separating vocals from music/effects)
- noisereduce for ambient noise and hiss removal
- FFmpeg for video/audio manipulation and atempo conform operations
- Pydub for audio slicing, concatenation, and overlay operations
- ffmpeg-python wrapper for Python integration

**Infrastructure:**
- AWS/GCP for cloud hosting
- S3/GCS for object storage
- GPU instances (A100/V100) for model inference
- Kubernetes for container orchestration
- Docker for containerization

## Components and Interfaces

### 1. Web Application Layer

**Components:**
- **Authentication Module**: Handles user registration, login, password reset
- **Dashboard**: Displays project list with status, progress, and actions
- **Project Wizard**: Step-by-step interface for video upload and configuration
- **Transcript Editor**: Interactive editor for reviewing/editing STT output
- **Translation Editor**: Side-by-side editor for source and translated text
- **Voice Manager**: Interface for selecting preset voices or creating clones
- **Video Player**: Preview player for final dubbed videos
- **Settings**: User profile, subscription management, API keys

**Key Interfaces:**
```typescript
interface User {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'creator' | 'pro' | 'enterprise';
  processingMinutesUsed: number;
  processingMinutesLimit: number;
  voiceCloneSlots: number;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  status: 'uploading' | 'processing' | 'review' | 'completed' | 'failed';
  sourceLanguage: string;
  targetLanguages: string[];
  videoUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcessingJob {
  id: string;
  projectId: string;
  stage: 'stt' | 'mt' | 'tts' | 'lipsync' | 'muxing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}
```

### 2. API Gateway Layer

**Endpoints:**

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

**Projects:**
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project configuration
- `DELETE /api/projects/:id` - Delete project

**Video Processing:**
- `POST /api/projects/:id/upload` - Upload video file
- `POST /api/projects/:id/start` - Start processing pipeline
- `GET /api/projects/:id/status` - Get processing status
- `GET /api/projects/:id/transcript` - Get STT transcript
- `PUT /api/projects/:id/transcript` - Update transcript
- `GET /api/projects/:id/translation` - Get translation
- `PUT /api/projects/:id/translation` - Update translation
- `POST /api/projects/:id/approve-stage` - Approve stage and continue

**Voice Management:**
- `GET /api/voices` - List available preset voices
- `POST /api/voices/clone` - Create voice clone from sample
- `GET /api/voices/clones` - List user's voice clones
- `DELETE /api/voices/clones/:id` - Delete voice clone

**Subscription:**
- `GET /api/subscription` - Get current subscription details
- `POST /api/subscription/upgrade` - Upgrade subscription tier

### 3. Job Queue System

**Queue Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ STT Queue   │────▶│  MT Queue   │────▶│ TTS Queue   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Muxing Queue│
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │Lip-Sync Queue│
                                        │  (Optional)  │
                                        └─────────────┘
```

**Job Interface:**
```typescript
interface JobData {
  projectId: string;
  userId: string;
  stage: PipelineStage;
  inputData: {
    audioUrl?: string;
    videoUrl?: string;
    transcript?: Transcript;
    translation?: Translation;
    voiceConfig?: VoiceConfig;
  };
  config: {
    sourceLanguage: string;
    targetLanguage: string;
    enableLipSync: boolean;
    subscriptionTier: string;
  };
}

interface JobResult {
  success: boolean;
  outputData: {
    transcript?: Transcript;
    translation?: Translation;
    audioUrl?: string;
    videoUrl?: string;
  };
  metadata: {
    processingTime: number;
    confidence?: number;
    warnings?: string[];
  };
  error?: string;
}
```

### 4. Model Abstraction Layer

**Adapter Pattern Implementation:**

```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class STTAdapter(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, language: str) -> Dict[str, Any]:
        """
        Returns: {
            'text': str,
            'segments': List[{
                'start': float,
                'end': float,
                'text': str,
                'speaker': str,
                'confidence': float
            }]
        }
        """
        pass

class WhisperPyannoteAdapter(STTAdapter):
    def __init__(self, whisper_model, pyannote_pipeline):
        self.whisper = whisper_model
        self.diarization = pyannote_pipeline
    
    def transcribe(self, audio_path: str, language: str) -> Dict[str, Any]:
        # Whisper transcription
        transcription = self.whisper.transcribe(audio_path, language=language)
        
        # Pyannote diarization
        diarization = self.diarization(audio_path)
        
        # Align and merge
        segments = self._align_speaker_labels(transcription, diarization)
        
        return {
            'text': transcription['text'],
            'segments': segments
        }

class MTAdapter(ABC):
    @abstractmethod
    def translate(self, text: str, source_lang: str, target_lang: str, 
                  glossary: Dict[str, str] = None) -> str:
        pass

class TTSAdapter(ABC):
    @abstractmethod
    def synthesize(self, text: str, voice_config: Dict[str, Any], 
                   timestamps: List[Dict] = None) -> bytes:
        """
        Returns: Audio bytes (WAV format)
        """
        pass

class LipSyncAdapter(ABC):
    @abstractmethod
    def sync(self, video_path: str, audio_path: str) -> str:
        """
        Returns: Path to synced video
        """
        pass
```

### 5. Processing Workers

**STT Worker:**
```python
class STTWorker:
    def __init__(self, stt_adapter: STTAdapter):
        self.stt = stt_adapter
    
    async def process(self, job_data: Dict) -> Dict:
        audio_path = await self.download_audio(job_data['audioUrl'])
        
        result = self.stt.transcribe(
            audio_path=audio_path,
            language=job_data['sourceLanguage']
        )
        
        # Store transcript
        transcript_url = await self.upload_transcript(result)
        
        # Update job status
        await self.update_job_status(job_data['projectId'], 'stt', 'completed')
        
        # Trigger next stage
        await self.enqueue_mt_job(job_data['projectId'])
        
        return {
            'success': True,
            'transcriptUrl': transcript_url,
            'metadata': {
                'duration': result['duration'],
                'speakerCount': len(set(s['speaker'] for s in result['segments']))
            }
        }
```

**TTS Worker:**
```python
class TTSWorker:
    def __init__(self, tts_adapter: TTSAdapter):
        self.tts = tts_adapter
    
    async def process(self, job_data: Dict) -> Dict:
        translation = await self.fetch_translation(job_data['projectId'])
        voice_config = await self.fetch_voice_config(job_data['projectId'])
        
        # Generate audio for each segment
        audio_segments = []
        for segment in translation['segments']:
            audio_bytes = self.tts.synthesize(
                text=segment['text'],
                voice_config=voice_config,
                timestamps=[segment['start'], segment['end']]
            )
            audio_segments.append(audio_bytes)
        
        # Concatenate segments
        final_audio = self.concatenate_audio(audio_segments, translation['segments'])
        
        # Upload
        audio_url = await self.upload_audio(final_audio)
        
        # Trigger muxing
        await self.enqueue_muxing_job(job_data['projectId'], audio_url)
        
        return {'success': True, 'audioUrl': audio_url}
```

### 6. FFmpeg Integration

**Video Processing Service:**
```python
import ffmpeg

class VideoProcessor:
    def extract_audio(self, video_path: str, output_path: str) -> str:
        """Extract audio track from video"""
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.output(stream.audio, output_path, acodec='pcm_s16le', ar='16000')
        ffmpeg.run(stream, overwrite_output=True)
        return output_path
    
    def mux_audio_video(self, video_path: str, audio_path: str, output_path: str, 
                        apply_watermark: bool = False) -> str:
        """Combine video with new audio track"""
        video = ffmpeg.input(video_path).video
        audio = ffmpeg.input(audio_path).audio
        
        if apply_watermark:
            video = self.add_watermark(video)
        
        stream = ffmpeg.output(video, audio, output_path, vcodec='copy', acodec='aac')
        ffmpeg.run(stream, overwrite_output=True)
        return output_path
    
    def add_watermark(self, video_stream, watermark_text: str = "Preview"):
        """Add watermark overlay"""
        return video_stream.drawtext(
            text=watermark_text,
            fontsize=24,
            fontcolor='white@0.5',
            x='(w-text_w)/2',
            y='h-th-10'
        )
```

## Robust Pipeline Architecture

### Challenge 1: Audio Contamination Solution

**Problem:** Background music, sound effects, and ambient noise contaminate vocal samples used for voice cloning, resulting in poor TTS quality with artifacts.

**Solution: Vocal Isolation Pipeline**

```python
class VocalIsolationPipeline:
    def __init__(self, demucs_model, noise_reducer):
        self.demucs = demucs_model
        self.noise_reducer = noise_reducer
    
    def process_segment(self, audio_path: str, start_ms: int, end_ms: int) -> str:
        """
        Extract and clean vocal sample for a segment
        Returns: Path to clean style prompt
        """
        # Step 1: Slice audio segment
        audio = AudioSegment.from_file(audio_path)
        segment = audio[start_ms:end_ms]
        temp_path = f"temp_segment_{start_ms}.wav"
        segment.export(temp_path, format="wav")
        
        # Step 2: Separate vocals from music/effects using Demucs
        vocals_path = self.demucs.separate(temp_path, stems=["vocals"])
        
        # Step 3: Remove ambient noise and hiss
        vocals_audio, sr = librosa.load(vocals_path, sr=16000)
        clean_vocals = self.noise_reducer.reduce_noise(
            y=vocals_audio,
            sr=sr,
            stationary=True,
            prop_decrease=0.8
        )
        
        # Step 4: Save clean style prompt
        clean_path = f"clean_prompt_{start_ms}.wav"
        sf.write(clean_path, clean_vocals, sr)
        
        return clean_path
```

**Benefits:**
- Eliminates music and sound effects contamination
- Removes ambient noise and hiss
- Produces clean vocal samples ideal for voice cloning
- Maintains vocal quality and characteristics

### Challenge 2: LLM Obedience Solution

**Problem:** LLMs often ignore timing constraints, producing translations that are too long or too short, causing synchronization issues.

**Solution: Intelligent Adaptation Engine with Validation Loop**

```python
class AdaptationEngine:
    def __init__(self, llm_client, few_shot_examples: List[Dict]):
        self.llm = llm_client
        self.few_shot_examples = few_shot_examples
        self.max_retries = 2
    
    def build_prompt(self, segment: Dict, attempt: int = 0, previous_feedback: str = None) -> str:
        """Build dynamic prompt with few-shot examples and context"""
        prompt = "You are a professional translator specializing in timing-aware dubbing.\n\n"
        
        # Add few-shot examples
        prompt += "Here are examples of excellent timing-aware translations:\n\n"
        for example in self.few_shot_examples:
            prompt += f"Original ({example['duration']}s, {example['emotion']}): {example['source']}\n"
            prompt += f"Translation: {example['target']}\n\n"
        
        # Add context
        prompt += f"Context:\n"
        prompt += f"Previous line: {segment['previous_line']}\n"
        prompt += f"Current line ({segment['duration']}s, {segment['emotion']}): {segment['text']}\n"
        prompt += f"Next line: {segment['next_line']}\n\n"
        
        # Add feedback from previous attempt if retry
        if previous_feedback:
            prompt += f"IMPORTANT: Your previous translation was {previous_feedback}. "
            prompt += f"Please be more {'concise' if 'too long' in previous_feedback else 'expressive'} "
            prompt += f"while strictly adhering to the {segment['duration']}s time limit.\n\n"
        
        prompt += f"Translate the current line to {segment['target_language']}, "
        prompt += f"ensuring it can be spoken naturally in {segment['duration']} seconds "
        prompt += f"while preserving the {segment['emotion']} emotion."
        
        return prompt
    
    def validate_translation(self, original: str, translation: str, duration: float) -> Tuple[bool, str]:
        """Validate translation meets timing requirements"""
        # Heuristic check: character count
        char_ratio = len(translation) / len(original)
        if char_ratio > 1.5 or char_ratio < 0.5:
            return False, f"too {'long' if char_ratio > 1.5 else 'short'}"
        
        # LLM-as-Judge check
        judge_prompt = f"Can this text: '{translation}' be spoken naturally in {duration} seconds? Answer ONLY YES or NO."
        response = self.llm.generate(judge_prompt, model="gemini-flash", max_tokens=5)
        
        if "NO" in response.upper():
            return False, "failed natural speech test"
        
        return True, "passed"
    
    def adapt_segment(self, segment: Dict) -> Dict:
        """Adapt segment with retry logic"""
        feedback = None
        
        for attempt in range(self.max_retries + 1):
            # Generate translation
            prompt = self.build_prompt(segment, attempt, feedback)
            translation = self.llm.generate(prompt, model="gemini-pro")
            
            # Validate
            is_valid, message = self.validate_translation(
                segment['text'],
                translation,
                segment['duration']
            )
            
            if is_valid:
                return {
                    'adapted_text': translation,
                    'status': 'success',
                    'attempts': attempt + 1
                }
            
            feedback = message
        
        # All retries exhausted
        return {
            'adapted_text': translation,
            'status': 'failed_adaptation',
            'attempts': self.max_retries + 1,
            'reason': feedback
        }
```

**Benefits:**
- Few-shot examples guide LLM toward timing-aware behavior
- Heuristic validation catches obvious length mismatches
- LLM-as-Judge provides semantic validation
- Retry logic with feedback improves success rate
- Failed segments are flagged for manual review

### Challenge 3: Audio Drift Solution

**Problem:** Concatenating audio segments causes cumulative timing drift, resulting in desynchronization by the end of long videos.

**Solution: Absolute Synchronization with Conform & Overlay**

```python
class AbsoluteSynchronizationAssembler:
    def __init__(self):
        self.ffmpeg = FFmpegWrapper()
    
    def assemble_final_audio(self, context_map: List[Dict], original_duration_ms: int) -> str:
        """Assemble final audio with absolute synchronization"""
        # Step 1: Create silent base track of exact original duration
        final_track = AudioSegment.silent(duration=original_duration_ms)
        
        # Step 2: Process each segment
        for segment in context_map:
            if segment['status'] != 'success':
                continue  # Skip failed segments
            
            # Load generated audio
            generated_audio = AudioSegment.from_file(segment['generated_audio_path'])
            actual_duration_ms = len(generated_audio)
            target_duration_ms = segment['end_ms'] - segment['start_ms']
            
            # Step 3: Conform audio to exact target duration
            if actual_duration_ms != target_duration_ms:
                conformed_path = self.conform_audio(
                    segment['generated_audio_path'],
                    actual_duration_ms,
                    target_duration_ms
                )
                conformed_audio = AudioSegment.from_file(conformed_path)
            else:
                conformed_audio = generated_audio
            
            # Step 4: Overlay at exact millisecond position
            final_track = final_track.overlay(
                conformed_audio,
                position=segment['start_ms']
            )
        
        # Step 5: Export final track
        output_path = "final_dubbed_audio.wav"
        final_track.export(output_path, format="wav")
        
        return output_path
    
    def conform_audio(self, audio_path: str, actual_ms: int, target_ms: int) -> str:
        """Use FFmpeg atempo to conform audio to exact duration"""
        tempo_factor = actual_ms / target_ms
        
        # FFmpeg atempo filter (supports 0.5 to 2.0)
        if 0.5 <= tempo_factor <= 2.0:
            output_path = f"conformed_{os.path.basename(audio_path)}"
            stream = ffmpeg.input(audio_path)
            stream = ffmpeg.filter(stream, 'atempo', tempo_factor)
            stream = ffmpeg.output(stream, output_path)
            ffmpeg.run(stream, overwrite_output=True)
            return output_path
        else:
            # Chain multiple atempo filters for extreme ratios
            return self.conform_audio_extreme(audio_path, tempo_factor)
```

**Benefits:**
- Silent base track ensures exact original duration
- Conform operation forces each segment to exact target duration
- Overlay at absolute positions eliminates cumulative drift
- Preserves original silences between segments
- Perfect synchronization regardless of video length

### Context Map Structure

The Context Map is the central data structure that flows through the entire pipeline:

```json
{
  "project_id": "uuid",
  "original_duration_ms": 125500,
  "segments": [
    {
      "id": 0,
      "start_ms": 0,
      "end_ms": 3500,
      "duration": 3.5,
      "text": "Hello everyone, welcome to my channel.",
      "speaker": "SPEAKER_00",
      "confidence": 0.95,
      "clean_prompt_path": "/path/to/clean_prompt_000.wav",
      "emotion": "happy",
      "previous_line": null,
      "next_line": "Today we're going to talk about...",
      "adapted_text": "Hola a todos, bienvenidos a mi canal.",
      "status": "success",
      "attempts": 1,
      "generated_audio_path": "/path/to/dubbed_000.wav"
    },
    {
      "id": 1,
      "start_ms": 3500,
      "end_ms": 7200,
      "duration": 3.7,
      "text": "Today we're going to talk about AI dubbing.",
      "speaker": "SPEAKER_00",
      "confidence": 0.92,
      "clean_prompt_path": "/path/to/clean_prompt_001.wav",
      "emotion": "neutral",
      "previous_line": "Hello everyone, welcome to my channel.",
      "next_line": "This technology is amazing.",
      "adapted_text": "Hoy vamos a hablar sobre doblaje con IA.",
      "status": "success",
      "attempts": 2,
      "generated_audio_path": "/path/to/dubbed_001.wav"
    }
  ]
}
```

## Data Models

### Database Schema

**Users Table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    processing_minutes_used INTEGER DEFAULT 0,
    processing_minutes_limit INTEGER DEFAULT 10,
    voice_clone_slots INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Projects Table:**
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'uploading',
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    video_url TEXT,
    audio_url TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Transcripts Table:**
```sql
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    edited_content JSONB,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Translations Table:**
```sql
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    target_language VARCHAR(10) NOT NULL,
    content JSONB NOT NULL,
    edited_content JSONB,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Voice Clones Table:**
```sql
CREATE TABLE voice_clones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sample_audio_url TEXT NOT NULL,
    model_data JSONB NOT NULL,
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Jobs Table:**
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    stage VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### JSON Data Structures

**Transcript Format:**
```json
{
  "text": "Full transcript text",
  "duration": 125.5,
  "language": "en",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Hello everyone, welcome to my channel.",
      "speaker": "SPEAKER_00",
      "confidence": 0.95,
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.98},
        {"word": "everyone", "start": 0.5, "end": 1.0, "confidence": 0.96}
      ]
    }
  ]
}
```

**Voice Configuration:**
```json
{
  "type": "preset" | "clone",
  "voiceId": "uuid-or-preset-name",
  "parameters": {
    "speed": 1.0,
    "pitch": 0,
    "emotion": "neutral",
    "style": "conversational"
  },
  "speakerMapping": {
    "SPEAKER_00": "voice-id-1",
    "SPEAKER_01": "voice-id-2"
  }
}
```

## Error Handling

### Error Categories and Strategies

**1. User Input Errors:**
- Invalid file format/size
- Unsupported language pair
- Insufficient subscription quota
- **Strategy**: Validate at API layer, return 400 with clear message

**2. Processing Errors:**
- STT transcription failure (poor audio quality)
- MT translation failure (unsupported language)
- TTS synthesis failure (text too long)
- Lip-sync failure (face not detected)
- **Strategy**: Catch in workers, store error in job record, notify user, allow retry

**3. Infrastructure Errors:**
- Model service unavailable
- GPU out of memory
- Storage service failure
- **Strategy**: Implement retry logic with exponential backoff, fallback to alternative models

**4. Quality Issues:**
- Low transcription confidence
- Untranslatable terms
- Voice clone quality insufficient
- **Strategy**: Flag for user review, provide editing interface, suggest improvements

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

// Example
{
  "error": {
    "code": "STT_LOW_CONFIDENCE",
    "message": "Transcription completed with low confidence. Please review and edit.",
    "details": {
      "averageConfidence": 0.65,
      "lowConfidenceSegments": [2, 5, 8]
    },
    "retryable": false
  }
}
```

### Retry and Fallback Logic

```python
class ProcessingWorker:
    MAX_RETRIES = 3
    RETRY_DELAY = [5, 15, 60]  # seconds
    
    async def process_with_retry(self, job_data: Dict) -> Dict:
        for attempt in range(self.MAX_RETRIES):
            try:
                result = await self.process(job_data)
                return result
            except ModelUnavailableError as e:
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY[attempt])
                    continue
                else:
                    # Try fallback model
                    return await self.process_with_fallback(job_data)
            except Exception as e:
                await self.log_error(job_data, e)
                raise
```

## Pre-Flight Validation System

The pre-flight validation system ensures all pipeline components work correctly before processing user videos. This is critical for the robust pipeline approach.

### Validation Tests

```python
class PreFlightValidator:
    def __init__(self):
        self.test_assets_path = "test_assets/"
        self.results = {}
    
    async def run_all_validations(self) -> Dict[str, bool]:
        """Run all pre-flight validation tests"""
        self.results['vocal_isolation'] = await self.test_vocal_isolation()
        self.results['noise_reduction'] = await self.test_noise_reduction()
        self.results['few_shot_loading'] = await self.test_few_shot_examples()
        self.results['conform_operation'] = await self.test_conform_operation()
        self.results['absolute_sync'] = await self.test_absolute_synchronization()
        
        return self.results
    
    async def test_vocal_isolation(self) -> bool:
        """Test Demucs can separate vocals from music"""
        try:
            # Load test audio with music and speech
            test_audio = f"{self.test_assets_path}music_and_speech.wav"
            
            # Run Demucs
            demucs = DemucsModel()
            vocals_path = demucs.separate(test_audio, stems=["vocals"])
            
            # Verify vocals file exists and has content
            vocals_audio, sr = librosa.load(vocals_path)
            
            # Check that music is significantly reduced
            # (Compare spectral energy in music frequency bands)
            music_energy = self.measure_music_energy(vocals_audio, sr)
            
            return music_energy < 0.1  # Less than 10% music energy
        except Exception as e:
            logger.error(f"Vocal isolation test failed: {e}")
            return False
    
    async def test_noise_reduction(self) -> bool:
        """Test noisereduce can clean vocals"""
        try:
            # Load test audio with noise
            test_audio = f"{self.test_assets_path}noisy_vocals.wav"
            audio, sr = librosa.load(test_audio, sr=16000)
            
            # Apply noise reduction
            clean_audio = nr.reduce_noise(y=audio, sr=sr, stationary=True)
            
            # Verify noise is reduced (measure SNR improvement)
            snr_before = self.calculate_snr(audio)
            snr_after = self.calculate_snr(clean_audio)
            
            return snr_after > snr_before + 5  # At least 5dB improvement
        except Exception as e:
            logger.error(f"Noise reduction test failed: {e}")
            return False
    
    async def test_few_shot_examples(self) -> bool:
        """Test few-shot examples can be loaded"""
        try:
            with open('few_shot_examples.json', 'r') as f:
                examples = json.load(f)
            
            # Verify structure
            required_fields = ['source', 'target', 'duration', 'emotion']
            for example in examples:
                if not all(field in example for field in required_fields):
                    return False
            
            return len(examples) >= 3  # At least 3 examples
        except Exception as e:
            logger.error(f"Few-shot examples test failed: {e}")
            return False
    
    async def test_conform_operation(self) -> bool:
        """Test FFmpeg atempo produces exact duration"""
        try:
            # Create test audio of 1.0 second
            test_audio = AudioSegment.silent(duration=1000)
            test_path = f"{self.test_assets_path}test_1s.wav"
            test_audio.export(test_path, format="wav")
            
            # Conform to 1.5 seconds
            target_ms = 1500
            conformed_path = self.conform_audio(test_path, 1000, target_ms)
            
            # Verify exact duration
            conformed = AudioSegment.from_file(conformed_path)
            actual_ms = len(conformed)
            
            # Allow 10ms tolerance
            return abs(actual_ms - target_ms) < 10
        except Exception as e:
            logger.error(f"Conform operation test failed: {e}")
            return False
    
    async def test_absolute_synchronization(self) -> bool:
        """Test overlay places audio at exact position"""
        try:
            # Create 10-second silent base
            base = AudioSegment.silent(duration=10000)
            
            # Create 1-second test tone
            test_tone = self.generate_test_tone(duration_ms=1000, frequency=440)
            
            # Overlay at 5-second mark
            result = base.overlay(test_tone, position=5000)
            
            # Verify total duration is still 10 seconds
            if len(result) != 10000:
                return False
            
            # Verify tone is at correct position
            # (Check energy at 5-6 second range)
            segment_5_6 = result[5000:6000]
            energy = segment_5_6.rms
            
            # Verify silence before and after
            segment_4_5 = result[4000:5000]
            segment_6_7 = result[6000:7000]
            
            return (energy > 100 and 
                    segment_4_5.rms < 10 and 
                    segment_6_7.rms < 10)
        except Exception as e:
            logger.error(f"Absolute synchronization test failed: {e}")
            return False
```

### Validation on Startup

```python
# In main application startup
async def startup_validation():
    validator = PreFlightValidator()
    results = await validator.run_all_validations()
    
    failed_tests = [test for test, passed in results.items() if not passed]
    
    if failed_tests:
        logger.error(f"Pre-flight validation failed: {failed_tests}")
        raise RuntimeError(f"System not ready. Failed tests: {failed_tests}")
    
    logger.info("All pre-flight validations passed. System ready.")
```

## Testing Strategy

### Unit Testing

**Backend API Tests:**
- Authentication flow (registration, login, JWT validation)
- Project CRUD operations
- Subscription tier enforcement
- Input validation

**Worker Tests:**
- Model adapter interface compliance
- Job processing logic
- Error handling and retry logic
- Data transformation accuracy

**Frontend Tests:**
- Component rendering
- User interaction flows
- Form validation
- State management

### Integration Testing

**Pipeline Tests:**
- End-to-end video processing flow
- Stage transitions and data passing
- Human-in-the-loop approval workflow
- Multi-speaker voice assignment

**API Integration Tests:**
- WebSocket real-time updates
- File upload and storage
- Database transactions
- External service integration (payment, email)

### Model Quality Testing

**Accuracy Benchmarks:**
- STT Word Error Rate (WER) on test dataset
- MT BLEU score comparison
- TTS Mean Opinion Score (MOS) evaluation
- Lip-sync accuracy metrics

**Performance Testing:**
- Model inference latency
- GPU utilization efficiency
- Concurrent job processing capacity
- Cost per minute of video processed

### User Acceptance Testing

**Beta Testing Program:**
- Recruit 50-100 target users (YouTubers, course creators)
- Provide free Pro tier access
- Collect feedback on:
  - Audio quality vs. competitors
  - Workflow usability
  - Feature completeness
  - Pricing perception

**Quality Metrics:**
- User satisfaction score (1-10)
- Net Promoter Score (NPS)
- Completion rate (% of started projects completed)
- Retry rate (% of projects requiring re-processing)

### Testing Tools

- **Unit Tests**: Jest (frontend), Pytest (backend/workers)
- **Integration Tests**: Supertest (API), Playwright (E2E)
- **Load Testing**: k6 for API stress testing
- **Model Testing**: Custom Python scripts with benchmark datasets
- **Monitoring**: Sentry for error tracking, DataDog for performance monitoring

## Security Considerations

**Authentication & Authorization:**
- JWT tokens with short expiration (15 min access, 7 day refresh)
- Password hashing with bcrypt (cost factor 12)
- Role-based access control for admin features
- API rate limiting per user/IP

**Data Protection:**
- Encryption at rest for stored videos (S3 server-side encryption)
- Encryption in transit (TLS 1.3)
- Signed URLs for temporary file access
- Automatic deletion of processed files after 30 days

**Model Security:**
- Isolated model inference containers
- Input sanitization to prevent prompt injection
- Resource limits to prevent DoS
- Model versioning and rollback capability

**Compliance:**
- GDPR compliance for EU users (data export, deletion)
- CCPA compliance for California users
- Terms of Service for AI-generated content
- Copyright and licensing considerations for voice clones
