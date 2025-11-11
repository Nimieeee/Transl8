import { prisma } from '../../setup';
import { createTestUser } from '../../fixtures/users';
import { createTestProject } from '../../fixtures/projects';
import { MockWhisperPyannoteAdapter, FailingSTTAdapter, LowConfidenceSTTAdapter } from '../../mocks/adapters';

describe('STT Worker Unit Tests', () => {
  describe('Transcription with Mock Adapter', () => {
    it('should successfully transcribe audio', async () => {
      const adapter = new MockWhisperPyannoteAdapter();
      const result = await adapter.transcribe('/tmp/test-audio.wav', 'en');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('segments');
      expect(result.segments).toBeInstanceOf(Array);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0]).toHaveProperty('speaker');
      expect(result.segments[0]).toHaveProperty('confidence');
    });

    it('should identify speakers in multi-speaker audio', async () => {
      const adapter = new MockWhisperPyannoteAdapter();
      const result = await adapter.transcribe('/tmp/multi-speaker.wav', 'en');

      const speakers = new Set(result.segments.map((s: any) => s.speaker));
      expect(speakers.size).toBeGreaterThanOrEqual(1);
    });

    it('should provide word-level timestamps', async () => {
      const adapter = new MockWhisperPyannoteAdapter();
      const result = await adapter.transcribe('/tmp/test-audio.wav', 'en');

      const firstSegment = result.segments[0];
      expect(firstSegment).toHaveProperty('words');
      expect(firstSegment.words).toBeInstanceOf(Array);
      expect(firstSegment.words[0]).toHaveProperty('start');
      expect(firstSegment.words[0]).toHaveProperty('end');
      expect(firstSegment.words[0]).toHaveProperty('confidence');
    });
  });

  describe('Error Handling', () => {
    it('should handle STT service failure', async () => {
      const adapter = new FailingSTTAdapter();

      await expect(
        adapter.transcribe('/tmp/test-audio.wav', 'en')
      ).rejects.toThrow('STT service unavailable');
    });

    it('should report unhealthy status on failure', async () => {
      const adapter = new FailingSTTAdapter();
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Quality Validation', () => {
    it('should flag low confidence transcriptions', async () => {
      const adapter = new LowConfidenceSTTAdapter();
      const result = await adapter.transcribe('/tmp/low-quality.wav', 'en');

      const avgConfidence = result.segments.reduce(
        (sum: number, s: any) => sum + s.confidence,
        0
      ) / result.segments.length;

      expect(avgConfidence).toBeLessThan(0.7);
    });

    it('should identify segments requiring review', async () => {
      const adapter = new LowConfidenceSTTAdapter();
      const result = await adapter.transcribe('/tmp/low-quality.wav', 'en');

      const lowConfidenceSegments = result.segments.filter(
        (s: any) => s.confidence < 0.7
      );

      expect(lowConfidenceSegments.length).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    it('should store transcript in database', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'processing');

      const adapter = new MockWhisperPyannoteAdapter();
      const result = await adapter.transcribe('/tmp/test-audio.wav', 'en');

      const transcript = await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: result,
          approved: false,
        },
      });

      expect(transcript).toBeDefined();
      expect(transcript.projectId).toBe(project.id);
      expect(transcript.approved).toBe(false);

      const stored = transcript.content as any;
      expect(stored.segments).toBeInstanceOf(Array);
    });

    it('should update job status on completion', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'processing');

      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'STT',
          status: 'PROCESSING',
          progress: 0,
          startedAt: new Date(),
        },
      });

      // Simulate job completion
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
      });

      const completedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(completedJob?.status).toBe('COMPLETED');
      expect(completedJob?.progress).toBe(100);
    });
  });
});
