# Test Suite Documentation

This directory contains the comprehensive test suite for the AI Video Dubbing Platform backend.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and teardown
├── fixtures/                   # Test data fixtures
│   ├── users.ts               # User test data
│   ├── projects.ts            # Project test data
│   └── transcripts.ts         # Transcript and translation test data
├── mocks/                     # Mock implementations
│   └── adapters.ts            # Mock AI model adapters
├── utils/                     # Test utilities
│   └── auth-helper.ts         # Authentication helpers
├── integration/               # API integration tests
│   ├── auth.test.ts          # Authentication flow tests
│   ├── projects.test.ts      # Project CRUD tests
│   ├── subscription.test.ts  # Subscription tier enforcement tests
│   └── pipeline.test.ts      # End-to-end pipeline tests
└── unit/                      # Unit tests
    └── workers/               # Worker unit tests
        ├── stt-worker.test.ts
        ├── mt-worker.test.ts
        ├── tts-worker.test.ts
        └── lipsync-worker.test.ts
```

## Prerequisites

Before running tests, ensure you have:

1. **PostgreSQL** running locally or accessible via connection string
2. **Redis** running locally or accessible via connection string
3. **Environment variables** configured for testing

### Environment Setup

Create a `.env.test` file or set these environment variables:

```bash
# Test Database
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dubbing_test"

# Test Redis
TEST_REDIS_URL="redis://localhost:6379/1"

# JWT Secrets (test values)
JWT_SECRET="test-jwt-secret-key-for-testing-only"
JWT_REFRESH_SECRET="test-jwt-refresh-secret-key-for-testing-only"

# Storage (mock values for tests)
AWS_S3_BUCKET="test-bucket"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test-key"
AWS_SECRET_ACCESS_KEY="test-secret"
```

### Database Setup

1. Create the test database:
```bash
createdb dubbing_test
```

2. Run migrations:
```bash
npm run prisma:migrate:deploy
```

Or update the schema:
```bash
npx prisma db push
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites

**Integration Tests:**
```bash
npm run test:integration
```

**Unit Tests:**
```bash
npm run test:unit
```

**Specific Test File:**
```bash
npm test -- --testPathPatterns=integration/auth.test.ts
```

**With Coverage:**
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Categories

### 1. Authentication Tests (`integration/auth.test.ts`)

Tests the complete authentication flow:
- User registration with validation
- Login with JWT token generation
- Token refresh mechanism
- Logout and token invalidation
- Protected route access

**Requirements Covered:** 10.1, 10.2, 10.3, 10.4, 10.5

### 2. Project CRUD Tests (`integration/projects.test.ts`)

Tests project management operations:
- Creating projects with language configuration
- Listing user projects
- Retrieving project details
- Updating project configuration
- Deleting projects
- Authorization checks

**Requirements Covered:** 7.1, 7.2, 7.3, 7.4

### 3. Subscription Tier Tests (`integration/subscription.test.ts`)

Tests subscription tier enforcement:
- Processing minutes limits (free: 10 min, creator: 120 min, pro: unlimited)
- Voice clone slot limits
- Watermark application for free tier
- Lip-sync feature gating for pro tier
- Quota exceeded handling

**Requirements Covered:** 11.1, 11.2, 11.3, 11.4, 11.5

### 4. Pipeline Integration Tests (`integration/pipeline.test.ts`)

Tests the complete video processing pipeline:
- End-to-end video processing flow
- Stage transitions (STT → MT → TTS → Muxing → Lip-sync)
- Human-in-the-loop approval workflow
- Multi-speaker voice assignment
- Error handling and retry logic
- Job queue orchestration

**Requirements Covered:** 6.1, 6.2, 6.3, 6.4, 12.3

### 5. Worker Unit Tests (`unit/workers/*.test.ts`)

Tests individual worker components with mock adapters:

**STT Worker:**
- Transcription with speaker diarization
- Word-level timestamps
- Confidence scoring
- Quality validation
- Error handling

**MT Worker:**
- Text translation
- Batch translation
- Custom glossary application
- Timestamp preservation
- Speaker label preservation

**TTS Worker:**
- Voice synthesis (StyleTTS)
- Voice cloning (XTTS)
- Multi-speaker voice assignment
- Voice clone slot enforcement
- Quality validation

**Lip-Sync Worker:**
- Lip synchronization (Wav2Lip)
- Face enhancement (GFPGAN)
- Premium feature gating
- Quality settings
- Error handling

**Requirements Covered:** 15.2, 15.3

## Mock Adapters

The test suite uses mock implementations of AI model adapters to avoid dependencies on actual model services:

- `MockWhisperPyannoteAdapter` - Simulates STT with diarization
- `MockMarianMTAdapter` - Simulates translation
- `MockStyleTTSAdapter` - Simulates voice synthesis
- `MockXTTSAdapter` - Simulates voice cloning
- `MockWav2LipAdapter` - Simulates lip synchronization
- `FailingSTTAdapter` - Simulates service failures
- `LowConfidenceSTTAdapter` - Simulates low-quality transcriptions

## Test Data Fixtures

### Users
- `free` - Free tier user (10 min limit, 0 voice clones)
- `creator` - Creator tier user (120 min limit, 3 voice clones)
- `pro` - Pro tier user (unlimited, 10 voice clones)

### Projects
- `basic` - New project in UPLOADING status
- `processing` - Project in PROCESSING status
- `completed` - Completed project

### Transcripts
- `mockTranscript` - Single speaker transcript
- `mockMultiSpeakerTranscript` - Multi-speaker transcript
- `mockTranslation` - Translated content

## Troubleshooting

### Database Connection Issues

If tests fail with database connection errors:

1. Ensure PostgreSQL is running:
```bash
pg_isready
```

2. Check the connection string in your environment variables

3. Verify the test database exists:
```bash
psql -l | grep dubbing_test
```

### Redis Connection Issues

If tests fail with Redis connection errors:

1. Ensure Redis is running:
```bash
redis-cli ping
```

2. Check the Redis URL in your environment variables

### Migration Issues

If tests fail due to schema mismatches:

1. Reset the test database:
```bash
npm run db:reset
```

2. Or manually run migrations:
```bash
npx prisma migrate deploy
```

### Cleanup Between Test Runs

The test suite automatically cleans up data between tests using the `afterEach` hook in `setup.ts`. If you encounter stale data issues:

1. Manually flush Redis:
```bash
redis-cli -n 1 FLUSHDB
```

2. Manually clean the database:
```bash
psql dubbing_test -c "TRUNCATE users, projects, transcripts, translations, voice_clones, jobs, glossary CASCADE;"
```

## CI/CD Integration

The test suite is designed to run in CI/CD pipelines. Example GitHub Actions workflow:

```yaml
- name: Run Tests
  env:
    TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dubbing_test
    TEST_REDIS_URL: redis://localhost:6379/1
  run: |
    npm run prisma:migrate:deploy
    npm test -- --coverage --forceExit
```

## Coverage Goals

Target coverage metrics:
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

1. **Isolation:** Each test should be independent and not rely on other tests
2. **Cleanup:** Always clean up test data in `afterEach` hooks
3. **Mocking:** Use mock adapters to avoid external dependencies
4. **Assertions:** Use specific assertions rather than generic ones
5. **Naming:** Use descriptive test names that explain what is being tested
6. **Async:** Always use `async/await` for asynchronous operations
7. **Timeouts:** Set appropriate timeouts for long-running operations

## Future Enhancements

- [ ] Add E2E tests with real model services in staging environment
- [ ] Add performance benchmarking tests
- [ ] Add load testing for concurrent job processing
- [ ] Add security testing for authentication and authorization
- [ ] Add contract testing for API endpoints
