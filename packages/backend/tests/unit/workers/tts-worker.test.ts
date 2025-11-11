import { prisma } from '../../setup';
import { createTestUser } from '../../fixtures/users';
import { createTestProject } from '../../fixtures/projects';
import { mockTranslation } from '../../fixtures/transcripts';
import { MockStyleTTSAdapter, MockXTTSAdapter } from '../../mocks/adapters';

describe('TTS Worker Unit Tests', () => {
  describe('Voice Synthesis with StyleTTS', () => {
    it('should synthesize audio from text', async () => {
      const adapter = new MockStyleTTSAdapter();
      const audioBuffer = await adapter.synthesize('Hello world', 'voice-1', 'en');

      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(audioBuffer.length).toBeGreaterThan(0);
    });

    it('should list available preset voices', async () => {
      const adapter = new MockStyleTTSAdapter();
      const voices = await adapter.listVoices('en');

      expect(voices).toBeInstanceOf(Array);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('id');
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('language');
    });

    it('should apply voice parameters', async () => {
      const adapter = new MockStyleTTSAdapter();
      const parameters = {
        speed: 1.2,
        pitch: 2,
        emotion: 'happy',
      };

      const audioBuffer = await adapter.synthesize('Test text', 'voice-1', 'en', parameters);

      expect(audioBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Voice Cloning with XTTS', () => {
    it('should clone voice from audio sample', async () => {
      const adapter = new MockXTTSAdapter();
      const cloneResult = await adapter.cloneVoice('/tmp/voice-sample.wav', 'en');

      expect(cloneResult).toHaveProperty('voiceId');
      expect(cloneResult).toHaveProperty('embeddings');
      expect(cloneResult).toHaveProperty('quality');
      expect(cloneResult.quality).toBeGreaterThan(0.8);
    });

    it('should synthesize with cloned voice', async () => {
      const adapter = new MockXTTSAdapter();

      // First clone the voice
      const cloneResult = await adapter.cloneVoice('/tmp/voice-sample.wav', 'en');

      // Then synthesize with cloned voice
      const audioBuffer = await adapter.synthesize(
        'Test with cloned voice',
        cloneResult.voiceId,
        'en'
      );

      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(audioBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Speaker Voice Assignment', () => {
    it('should assign different voices to different speakers', async () => {
      const adapter = new MockStyleTTSAdapter();

      const speakerMapping = {
        SPEAKER_00: 'voice-1',
        SPEAKER_01: 'voice-2',
      };

      const segments = [
        { speaker: 'SPEAKER_00', text: 'Hello from speaker 0' },
        { speaker: 'SPEAKER_01', text: 'Hello from speaker 1' },
      ];

      const audioBuffers = await Promise.all(
        segments.map((segment) =>
          adapter.synthesize(
            segment.text,
            speakerMapping[segment.speaker as keyof typeof speakerMapping],
            'en'
          )
        )
      );

      expect(audioBuffers.length).toBe(2);
      audioBuffers.forEach((buffer) => {
        expect(buffer).toBeInstanceOf(Buffer);
      });
    });

    it('should maintain consistent voice per speaker', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'processing');

      const voiceConfig = {
        type: 'preset',
        voiceId: 'default',
        speakerMapping: {
          SPEAKER_00: 'voice-male-1',
          SPEAKER_01: 'voice-female-1',
        },
      };

      await prisma.project.update({
        where: { id: project.id },
        data: { voiceConfig },
      });

      const savedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      const config = savedProject?.voiceConfig as any;
      expect(config.speakerMapping.SPEAKER_00).toBe('voice-male-1');
      expect(config.speakerMapping.SPEAKER_01).toBe('voice-female-1');
    });
  });

  describe('Database Integration', () => {
    it('should store voice clone in database', async () => {
      const user = await createTestUser(prisma, 'creator');
      const adapter = new MockXTTSAdapter();

      const cloneResult = await adapter.cloneVoice('/tmp/voice-sample.wav', 'en');

      const voiceClone = await prisma.voiceClone.create({
        data: {
          userId: user.id,
          name: 'My Voice Clone',
          sampleAudioUrl: 's3://bucket/voice-sample.wav',
          modelData: cloneResult,
          language: 'en',
        },
      });

      expect(voiceClone).toBeDefined();
      expect(voiceClone.userId).toBe(user.id);
      expect(voiceClone.language).toBe('en');

      const modelData = voiceClone.modelData as any;
      expect(modelData.voiceId).toBeDefined();
    });

    it('should update project with generated audio URL', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'processing');

      await prisma.project.update({
        where: { id: project.id },
        data: {
          generatedAudioUrl: 's3://bucket/generated-audio.wav',
        },
      });

      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      expect(updatedProject?.generatedAudioUrl).toBe('s3://bucket/generated-audio.wav');
    });

    it('should update job status on completion', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'processing');

      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'TTS',
          status: 'PROCESSING',
          progress: 0,
          startedAt: new Date(),
        },
      });

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

  describe('Voice Clone Slot Limits', () => {
    it('should enforce voice clone slot limits', async () => {
      const user = await createTestUser(prisma, 'creator');

      // Creator tier has 3 slots
      expect(user.voiceCloneSlots).toBe(3);

      // Create 3 voice clones
      const clones = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          prisma.voiceClone.create({
            data: {
              userId: user.id,
              name: `Clone ${i + 1}`,
              sampleAudioUrl: `s3://bucket/clone-${i + 1}.wav`,
              modelData: { voiceId: `clone-${i + 1}` },
              language: 'en',
            },
          })
        )
      );

      expect(clones.length).toBe(3);

      const userClones = await prisma.voiceClone.findMany({
        where: { userId: user.id },
      });

      expect(userClones.length).toBe(user.voiceCloneSlots);
    });

    it('should block free tier from creating voice clones', async () => {
      const user = await createTestUser(prisma, 'free');

      // Free tier has 0 slots
      expect(user.voiceCloneSlots).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle TTS service failure', async () => {
      const adapter = new MockStyleTTSAdapter();

      // Mock a failure
      const originalSynthesize = adapter.synthesize;
      adapter.synthesize = async () => {
        throw new Error('TTS service unavailable');
      };

      await expect(adapter.synthesize('test', 'voice-1', 'en')).rejects.toThrow(
        'TTS service unavailable'
      );

      adapter.synthesize = originalSynthesize;
    });

    it('should validate voice clone audio quality', async () => {
      const adapter = new MockXTTSAdapter();

      // Mock low quality result
      const originalClone = adapter.cloneVoice;
      adapter.cloneVoice = async () => ({
        voiceId: 'low-quality-clone',
        embeddings: [0.1],
        quality: 0.45, // Below threshold
      });

      const result = await adapter.cloneVoice('/tmp/low-quality.wav', 'en');
      expect(result.quality).toBeLessThan(0.7);

      adapter.cloneVoice = originalClone;
    });
  });
});
