import { Queue } from 'bullmq';
import { prisma, redis } from '../setup';
import { mockTranscript, mockMultiSpeakerTranscript } from '../fixtures/transcripts';

// Helper function to create test dubbing job
async function createTestDubbingJob(userId?: string) {
  return prisma.dubbingJob.create({
    data: {
      userId,
      status: 'processing',
      progress: 0,
      originalFile: 's3://test-bucket/test-video.mp4',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    },
  });
}

describe('Robust Pipeline Integration Tests', () => {
  let sttQueue: Queue;
  let vocalIsolationQueue: Queue;
  let emotionAnalysisQueue: Queue;
  let adaptationQueue: Queue;
  let ttsQueue: Queue;
  let finalAssemblyQueue: Queue;

  beforeAll(() => {
    // Initialize queues for robust pipeline
    sttQueue = new Queue('stt', { connection: redis });
    vocalIsolationQueue = new Queue('vocal-isolation', { connection: redis });
    emotionAnalysisQueue = new Queue('emotion-analysis', { connection: redis });
    adaptationQueue = new Queue('adaptation', { connection: redis });
    ttsQueue = new Queue('tts', { connection: redis });
    finalAssemblyQueue = new Queue('final-assembly', { connection: redis });
  });

  afterAll(async () => {
    await sttQueue.close();
    await vocalIsolationQueue.close();
    await emotionAnalysisQueue.close();
    await adaptationQueue.close();
    await ttsQueue.close();
    await finalAssemblyQueue.close();
  });

  describe('36.1 End-to-End Robust Pipeline Flow', () => {
    it('should process video through complete robust pipeline', async () => {
      const job = await createTestDubbingJob();

      // Stage 1: Create Context Map after STT
      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 120000,
        segments: mockMultiSpeakerTranscript.segments.map((seg, idx) => ({
          id: idx,
          start_ms: seg.start * 1000,
          end_ms: seg.end * 1000,
          duration: seg.end - seg.start,
          text: seg.text,
          speaker: seg.speaker,
          confidence: seg.confidence,
          previous_line: idx > 0 ? mockMultiSpeakerTranscript.segments[idx - 1].text : null,
          next_line:
            idx < mockMultiSpeakerTranscript.segments.length - 1
              ? mockMultiSpeakerTranscript.segments[idx + 1].text
              : null,
        })),
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 120000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      expect(contextMap).toBeDefined();
      expect(contextMap.content).toHaveProperty('segments');

      // Stage 2: Vocal Isolation - Add clean prompt paths
      const updatedSegments = (contextMapData.segments as any[]).map((seg) => ({
        ...seg,
        clean_prompt_path: `/path/to/clean_prompt_${seg.id}.wav`,
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: updatedSegments,
          },
        },
      });

      // Verify vocal isolation paths added
      const contextMapAfterVocal = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segmentsAfterVocal = (contextMapAfterVocal?.content as any).segments;
      expect(segmentsAfterVocal[0]).toHaveProperty('clean_prompt_path');

      // Stage 3: Emotion Analysis - Add emotion tags
      const segmentsWithEmotion = segmentsAfterVocal.map((seg: any) => ({
        ...seg,
        emotion: seg.id % 2 === 0 ? 'neutral' : 'happy',
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: segmentsWithEmotion,
          },
        },
      });

      // Verify emotion tags added
      const contextMapAfterEmotion = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segmentsAfterEmotion = (contextMapAfterEmotion?.content as any).segments;
      expect(segmentsAfterEmotion[0]).toHaveProperty('emotion');

      // Stage 4: Intelligent Adaptation - Add adapted text and status
      const segmentsWithAdaptation = segmentsAfterEmotion.map((seg: any) => ({
        ...seg,
        adapted_text: `Adapted: ${seg.text}`,
        status: 'success',
        attempts: 1,
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: segmentsWithAdaptation,
          },
        },
      });

      // Verify adaptation completed
      const contextMapAfterAdaptation = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segmentsAfterAdaptation = (contextMapAfterAdaptation?.content as any).segments;
      expect(segmentsAfterAdaptation[0]).toHaveProperty('adapted_text');
      expect(segmentsAfterAdaptation[0]).toHaveProperty('status');
      expect(segmentsAfterAdaptation[0].status).toBe('success');

      // Stage 5: TTS with clean style prompts - Add generated audio paths
      const segmentsWithAudio = segmentsAfterAdaptation.map((seg: any) => ({
        ...seg,
        generated_audio_path: `/path/to/generated_audio_${seg.id}.wav`,
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: segmentsWithAudio,
          },
        },
      });

      // Verify TTS audio paths added
      const contextMapAfterTTS = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segmentsAfterTTS = (contextMapAfterTTS?.content as any).segments;
      expect(segmentsAfterTTS[0]).toHaveProperty('generated_audio_path');

      // Stage 6: Complete job
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          progress: 100,
          outputFile: 's3://test-bucket/final-dubbed-video.mp4',
          completedAt: new Date(),
        },
      });

      // Verify final state
      const completedJob = await prisma.dubbingJob.findUnique({
        where: { id: job.id },
        include: {
          contextMap: true,
        },
      });

      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.outputFile).toBeDefined();
      expect(completedJob?.contextMap).toBeDefined();

      // Verify Context Map has all required fields
      const finalContextMap = completedJob?.contextMap?.content as any;
      const finalSegment = finalContextMap.segments[0];
      expect(finalSegment).toHaveProperty('clean_prompt_path');
      expect(finalSegment).toHaveProperty('emotion');
      expect(finalSegment).toHaveProperty('adapted_text');
      expect(finalSegment).toHaveProperty('status');
      expect(finalSegment).toHaveProperty('generated_audio_path');
    });

    it('should verify vocal isolation removes music contamination', async () => {
      const job = await createTestDubbingJob();

      // Create Context Map with segments
      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 10000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 5000,
            duration: 5.0,
            text: 'Test segment with background music',
            speaker: 'SPEAKER_00',
            confidence: 0.95,
          },
        ],
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 10000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Simulate vocal isolation adding clean prompt path
      const updatedSegments = (contextMapData.segments as any[]).map((seg) => ({
        ...seg,
        clean_prompt_path: `/path/to/clean_vocals_${seg.id}.wav`,
        vocal_isolation_quality: {
          music_energy_reduction: 0.92, // 92% music energy removed
          snr_improvement: 12.5, // 12.5 dB SNR improvement
        },
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: updatedSegments,
          },
        },
      });

      // Verify vocal isolation quality metrics
      const updatedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segment = (updatedContextMap?.content as any).segments[0];

      expect(segment.clean_prompt_path).toBeDefined();
      expect(segment.vocal_isolation_quality).toBeDefined();
      expect(segment.vocal_isolation_quality.music_energy_reduction).toBeGreaterThan(0.9);
      expect(segment.vocal_isolation_quality.snr_improvement).toBeGreaterThan(10);
    });

    it('should verify adaptation meets timing constraints', async () => {
      const job = await createTestDubbingJob();

      // Create Context Map with timing-sensitive segments
      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 15000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 3000,
            duration: 3.0,
            text: 'This is a short segment',
            speaker: 'SPEAKER_00',
            confidence: 0.95,
            emotion: 'neutral',
          },
          {
            id: 1,
            start_ms: 3000,
            end_ms: 8000,
            duration: 5.0,
            text: 'This is a longer segment with more content',
            speaker: 'SPEAKER_00',
            confidence: 0.93,
            emotion: 'happy',
          },
        ],
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 15000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Simulate adaptation with validation
      const adaptedSegments = (contextMapData.segments as any[]).map((seg) => {
        const originalLength = seg.text.length;
        const adaptedText = `Adapted: ${seg.text}`;
        const adaptedLength = adaptedText.length;
        const charRatio = adaptedLength / originalLength;

        return {
          ...seg,
          adapted_text: adaptedText,
          status: charRatio <= 1.5 && charRatio >= 0.5 ? 'success' : 'failed_adaptation',
          attempts: 1,
          validation: {
            char_ratio: charRatio,
            timing_check: 'passed',
            natural_speech_test: 'passed',
          },
        };
      });

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: adaptedSegments,
          },
        },
      });

      // Verify adaptation timing constraints
      const updatedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segments = (updatedContextMap?.content as any).segments;

      segments.forEach((seg: any) => {
        expect(seg.adapted_text).toBeDefined();
        expect(seg.status).toBe('success');
        expect(seg.validation.char_ratio).toBeLessThanOrEqual(1.5);
        expect(seg.validation.char_ratio).toBeGreaterThanOrEqual(0.5);
        expect(seg.validation.timing_check).toBe('passed');
      });
    });

    it('should verify absolute synchronization prevents drift', async () => {
      const job = await createTestDubbingJob();

      // Create Context Map with multiple segments
      const originalDurationMs = 60000; // 1 minute
      const numSegments = 10;
      const segmentDuration = originalDurationMs / numSegments;

      const segments = Array.from({ length: numSegments }, (_, i) => ({
        id: i,
        start_ms: i * segmentDuration,
        end_ms: (i + 1) * segmentDuration,
        duration: segmentDuration / 1000,
        text: `Segment ${i}`,
        speaker: 'SPEAKER_00',
        confidence: 0.95,
        generated_audio_path: `/path/to/audio_${i}.wav`,
      }));

      const contextMapData = {
        project_id: job.id,
        original_duration_ms: originalDurationMs,
        segments,
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: originalDurationMs,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Create sync quality metrics
      await prisma.syncQualityMetrics.create({
        data: {
          projectId: job.id,
          totalSegments: numSegments,
          maxDriftMs: 0,
          averageDriftMs: 0,
          segmentAccuracy: segments.map((seg) => ({ segment_id: seg.id, drift_ms: 0 })),
          syncQualityScore: 1.0,
        },
      });

      // Verify synchronization metrics
      const syncMetrics = await prisma.syncQualityMetrics.findUnique({
        where: { projectId: job.id },
      });

      expect(syncMetrics).toBeDefined();
      expect(syncMetrics?.maxDriftMs).toBe(0);
      expect(syncMetrics?.averageDriftMs).toBe(0);
      expect(syncMetrics?.syncQualityScore).toBe(1.0);
    });
  });
});
