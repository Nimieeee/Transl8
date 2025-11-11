# MVP Prototype Implementation Plan

- [x] 1. Set up minimal database schema
  - Create simplified Prisma schema with User and DubbingJob models only
  - Remove all unnecessary fields and relations from existing schema
  - Run database migration
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement basic authentication
  - [x] 2.1 Create registration endpoint with email/password
    - Implement POST /api/auth/register with bcrypt password hashing
    - Return JWT token on successful registration
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 Create login endpoint
    - Implement POST /api/auth/login with credential validation
    - Return JWT token on successful login
    - _Requirements: 1.2_
  
  - [x] 2.3 Create simple auth middleware
    - Implement JWT verification middleware
    - Protect dubbing endpoints
    - _Requirements: 1.2_

- [x] 3. Build frontend authentication pages
  - [x] 3.1 Create registration page
    - Build simple form with email and password fields
    - Handle registration API call and store token
    - Redirect to upload page on success
    - _Requirements: 1.1_
  
  - [x] 3.2 Create login page
    - Build simple form with email and password fields
    - Handle login API call and store token
    - Redirect to upload page on success
    - _Requirements: 1.2_

- [x] 4. Implement video upload functionality
  - [x] 4.1 Create upload API endpoint
    - Implement POST /api/dub/upload with file handling
    - Validate file size (max 100MB) and format (MP4)
    - Store file to local filesystem
    - Create DubbingJob record in database
    - Queue job for processing
    - Return job ID to client
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 4.2 Build upload page UI
    - Create video file input component
    - Add language selector (English to Spanish only)
    - Show upload progress
    - Redirect to status page after upload
    - _Requirements: 2.1, 2.3_

- [x] 5. Create dubbing worker pipeline
  - [x] 5.1 Set up worker infrastructure
    - Configure BullMQ worker for dubbing jobs
    - Set up job queue with Redis
    - Implement basic error handling
    - _Requirements: 3.1_
  
  - [x] 5.2 Implement audio extraction step
    - Use ffmpeg to extract audio from video
    - Save audio file to temporary location
    - Update job progress to 20%
    - _Requirements: 3.2_
  
  - [x] 5.3 Implement transcription step
    - Call Whisper adapter to transcribe audio (or use mock)
    - Store transcript text
    - Update job progress to 40%
    - _Requirements: 3.3_
  
  - [x] 5.4 Implement translation step
    - Create LibreTranslate adapter or simple HTTP client
    - Call LibreTranslate API to translate English text to Spanish
    - Store translated text
    - Update job progress to 60%
    - _Requirements: 3.4_
  
  - [x] 5.5 Implement speech generation step
    - Generate Spanish audio from translated text (use TTS adapter or mock)
    - Save generated audio file
    - Update job progress to 80%
    - _Requirements: 3.5_
  
  - [x] 5.6 Implement audio merging step
    - Use ffmpeg to replace original audio with generated audio
    - Save final dubbed video
    - Update job progress to 100% and status to "completed"
    - Set expiration time (24 hours from now)
    - _Requirements: 3.6_

- [x] 6. Build job status tracking
  - [x] 6.1 Create status API endpoint
    - Implement GET /api/dub/status/:jobId
    - Return current job status, progress, and error if any
    - _Requirements: 4.1, 4.2_
  
  - [x] 6.2 Build status page UI
    - Create progress bar component showing 0-100%
    - Display current status message
    - Poll status endpoint every 2 seconds
    - Show error message if job fails
    - Redirect to download page when complete
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Implement video download
  - [x] 7.1 Create download API endpoint
    - Implement GET /api/dub/download/:jobId
    - Verify job is completed and not expired
    - Stream video file to client
    - _Requirements: 5.1, 5.2_
  
  - [x] 7.2 Build download page UI
    - Display success message
    - Show download button
    - Handle download click
    - _Requirements: 5.1, 5.2_

- [x] 8. Add basic error handling and cleanup
  - Implement try-catch blocks in all endpoints
  - Add error logging to console
  - Create cleanup script for expired videos
  - _Requirements: 5.3_

- [x] 9. Create simple startup script
  - Write script to start database, Redis, backend, worker, and frontend
  - Add basic environment variable setup
  - Create README with quick start instructions
  - _Requirements: All_
