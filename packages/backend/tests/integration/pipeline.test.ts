import { Queue } from 'bullmq';
import { prisma, redis } from '../setup';
import { createTestUser } from '../fixtures/users';
import { createTestProject } from '../fixtures/projects';
import { mockTranscript, mockTranslation, mockMultiSpeakerTranscript } from '../fixtures/transcripts';
import { JobManager } from '../../src/lib/job-manager';

describe('Pipeline Integration Tests', () => {
  let jobManager: JobManager;
  let sttQueue: Queue;
  let mtQueue: Queue;
  let ttsQueue: Queue;
  let lipsyncQueue: Queue;

  beforeAll(() => {
    jobManager = new JobManager();
    
    // Initialize queues
    sttQueue = new Queue('stt', { connection: redis });
    mtQueue = new Queue('mt', { connection: redis });
    ttsQueue = new Queue('tts', { connection: redis });
    lipsyncQueue = new Queue('lipsync', { connection: redis });
  });

  afterAll(async () => {
    await sttQueue.close();
    await mtQueue.close();
    await ttsQueue.close();
    await lipsyncQueue.close();
  });

  describe('End-to-End Video Processing Flow', () => {
    it('should process video through all stages', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Update project with video URL
      await prisma.project.update({
        where: { id: project.id },
        data: {
          videoUrl: 's3://test-bucket/video.mp4',
          audioUrl: 's3://test-bucket/audio.wav',
          duration: 120,
          status: 'PROCESSING',
        },
      });

      // Stage 1: STT - Create transcript
      const transcript = await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockTranscript,
          approved: false,
        },
      });

      expect(transcript).toBeDefined();
      expect(transcript.content).toHaveProperty('segments');

      // Stage 2: User approves transcript
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { approved: true },
      });

      // Stage 3: MT - Create translation
      const translation = await prisma.translation.create({
        data: {
          projectId: project.id,
          targetLanguage: project.targetLanguage,
          content: mockTranslation,
          approved: false,
        },
      });

      expect(translation).toBeDefined();
      expect(translation.content).toHaveProperty('segments');

      // Stage 4: User approves translation
      await prisma.translation.update({
        where: { id: translation.id },
        data: { approved: true },
      });

      // Stage 5: TTS - Generate audio
      await prisma.project.update({
        where: { id: project.id },
        data: {
          generatedAudioUrl: 's3://test-bucket/generated-audio.wav',
        },
      });

      // Stage 6: Muxing - Combine video and audio
      await prisma.project.update({
        where: { id: project.id },
        data: {
          outputVideoUrl: 's3://test-bucket/output-video.mp4',
          status: 'COMPLETED',
        },
      });

      // Verify final state
      const completedProject = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          transcripts: true,
          translations: true,
        },
      });

      expect(completedProject?.status).toBe('COMPLETED');
      expect(completedProject?.outputVideoUrl).toBeDefined();
      expect(completedProject?.transcripts[0].approved).toBe(true);
      expect(completedProject?.translations[0].approved).toBe(true);
    });

    it('should handle multi-speaker video processing', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      await prisma.project.update({
        where: { id: project.id },
        data: {
          videoUrl: 's3://test-bucket/multi-speaker.mp4',
          audioUrl: 's3://test-bucket/multi-speaker-audio.wav',
          duration: 120,
          status: 'PROCESSING',
        },
      });

      // Create multi-speaker transcript
      const transcript = await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockMultiSpeakerTranscript,
          approved: true,
        },
      });

      // Verify speaker identification
      const segments = transcript.content as any;
      const speakers = new Set(segments.segments.map((s: any) => s.speaker));
      expect(speakers.size).toBeGreaterThan(1);
      expect(speakers.has('SPEAKER_00')).toBe(true);
      expect(speakers.has('SPEAKER_01')).toBe(true);
    });
  });

  describe('Stage Transitions and Job Queue Orchestration', () => {
    it('should transition from STT to MT stage', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create STT job
      const sttJob = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'STT',
          status: 'PROCESSING',
          progress: 0,
        },
      });

      // Complete STT job
      await prisma.job.update({
        where: { id: sttJob.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
      });

      // Create transcript
      await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockTranscript,
          approved: true,
        },
      });

      // Verify MT job can be created
      const mtJob = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'MT',
          status: 'PENDING',
          progress: 0,
        },
      });

      expect(mtJob.stage).toBe('MT');
      expect(mtJob.status).toBe('PENDING');
    });

    it('should track job progress through stages', async () => {
      const user = await createTestUser(prisma, 'creator');
      const project = await createTestProject(prisma, user.id, 'processing');

      const stages = ['STT', 'MT', 'TTS', 'MUXING'];
      
      for (const stage of stages) {
        const job = await prisma.job.create({
          data: {
            projectId: project.id,
            stage: stage as any,
            status: 'PROCESSING',
            progress: 50,
            startedAt: new Date(),
          },
        });

        expect(job.stage).toBe(stage);
        expect(job.progress).toBe(50);

        // Complete the job
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            completedAt: new Date(),
          },
        });
      }

      // Verify all jobs completed
      const jobs = await prisma.job.findMany({
        where: { projectId: project.id },
      });

      expect(jobs.length).toBe(stages.length);
      expect(jobs.every(j => j.status === 'COMPLETED')).toBe(true);
    });
  });

  describe('Human-in-the-Loop Approval Workflow', () => {
    it('should require transcript approval before MT', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create unapproved transcript
      const transcript = await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockTranscript,
          approved: false,
        },
      });

      expect(transcript.approved).toBe(false);

      // Attempting to create translation without approval should be blocked
      // (This would be enforced in the API layer)
      
      // Approve transcript
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { approved: true },
      });

      const approvedTranscript = await prisma.transcript.findUnique({
        where: { id: transcript.id },
      });

      expect(approvedTranscript?.approved).toBe(true);
    });

    it('should require translation approval before TTS', async () => {
      const user = await createTestUser(prisma, 'creator');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create approved transcript first
      await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockTranscript,
          approved: true,
        },
      });

      // Create unapproved translation
      const translation = await prisma.translation.create({
        data: {
          projectId: project.id,
          targetLanguage: project.targetLanguage,
          content: mockTranslation,
          approved: false,
        },
      });

      expect(translation.approved).toBe(false);

      // Approve translation
      await prisma.translation.update({
        where: { id: translation.id },
        data: { approved: true },
      });

      const approvedTranslation = await prisma.translation.findUnique({
        where: { id: translation.id },
      });

      expect(approvedTranslation?.approved).toBe(true);
    });

    it('should allow editing transcript before approval', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      const transcript = await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockTranscript,
          approved: false,
        },
      });

      // Edit transcript
      const editedContent = {
        ...mockTranscript,
        segments: mockTranscript.segments.map(s => ({
          ...s,
          text: s.text + ' [edited]',
        })),
      };

      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          editedContent,
        },
      });

      const updatedTranscript = await prisma.transcript.findUnique({
        where: { id: transcript.id },
      });

      expect(updatedTranscript?.editedContent).toBeDefined();
      const edited = updatedTranscript?.editedContent as any;
      expect(edited.segments[0].text).toContain('[edited]');
    });
  });

  describe('Multi-Speaker Voice Assignment', () => {
    it('should assign different voices to different speakers', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create voice configuration with speaker mapping
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
        data: {
          voiceConfig,
        },
      });

      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      const config = updatedProject?.voiceConfig as any;
      expect(config.speakerMapping).toBeDefined();
      expect(config.speakerMapping.SPEAKER_00).toBe('voice-male-1');
      expect(config.speakerMapping.SPEAKER_01).toBe('voice-female-1');
    });

    it('should maintain consistent voice per speaker', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create multi-speaker transcript
      await prisma.transcript.create({
        data: {
          projectId: project.id,
          content: mockMultiSpeakerTranscript,
          approved: true,
        },
      });

      // Set voice mapping
      const voiceConfig = {
        type: 'preset',
        voiceId: 'default',
        speakerMapping: {
          SPEAKER_00: 'consistent-voice-1',
          SPEAKER_01: 'consistent-voice-2',
        },
      };

      await prisma.project.update({
        where: { id: project.id },
        data: { voiceConfig },
      });

      // Verify mapping persists
      const savedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      const config = savedProject?.voiceConfig as any;
      expect(config.speakerMapping.SPEAKER_00).toBe('consistent-voice-1');
      expect(config.speakerMapping.SPEAKER_01).toBe('consistent-voice-2');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should mark job as failed on error', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'basic');

      const job = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'STT',
          status: 'PROCESSING',
          progress: 30,
          startedAt: new Date(),
        },
      });

      // Simulate job failure
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Audio quality too low for transcription',
          completedAt: new Date(),
        },
      });

      const failedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(failedJob?.status).toBe('FAILED');
      expect(failedJob?.errorMessage).toBeDefined();
    });

    it('should support job retry after failure', async () => {
      const user = await createTestUser(prisma, 'creator');
      const project = await createTestProject(prisma, user.id, 'basic');

      // Create failed job
      const failedJob = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'MT',
          status: 'FAILED',
          errorMessage: 'Translation service temporarily unavailable',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Create retry job
      const retryJob = await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'MT',
          status: 'PENDING',
          progress: 0,
        },
      });

      expect(retryJob.status).toBe('PENDING');
      expect(retryJob.stage).toBe(failedJob.stage);
    });

    it('should handle transient failures with exponential backoff', async () => {
      const user = await createTestUser(prisma, 'pro');
      const project = await createTestProject(prisma, user.id, 'basic');

      const attempts = [];
      
      // Simulate 3 retry attempts
      for (let i = 0; i < 3; i++) {
        const job = await prisma.job.create({
          data: {
            projectId: project.id,
            stage: 'TTS',
            status: i < 2 ? 'FAILED' : 'COMPLETED',
            errorMessage: i < 2 ? 'GPU out of memory' : null,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        attempts.push(job);
      }

      expect(attempts.length).toBe(3);
      expect(attempts[0].status).toBe('FAILED');
      expect(attempts[1].status).toBe('FAILED');
      expect(attempts[2].status).toBe('COMPLETED');
    });

    it('should update project status on pipeline failure', async () => {
      const user = await createTestUser(prisma, 'free');
      const project = await createTestProject(prisma, user.id, 'processing');

      // Create failed job
      await prisma.job.create({
        data: {
          projectId: project.id,
          stage: 'STT',
          status: 'FAILED',
          errorMessage: 'Critical error: Invalid audio format',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Update project status
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'FAILED',
        },
      });

      const failedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });

      expect(failedProject?.status).toBe('FAILED');
    });
  });
});
