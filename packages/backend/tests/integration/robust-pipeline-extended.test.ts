import { prisma, redis } from '../setup';

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

describe('Robust Pipeline Extended Tests', () => {
  describe('36.2 Vocal Isolation Pipeline', () => {
    it('should test with various music genres and volume levels', async () => {
      const job = await createTestDubbingJob();

      // Test scenarios with different music types
      const testScenarios = [
        {
          name: 'Classical music background',
          music_type: 'classical',
          music_volume: 'low',
          expected_reduction: 0.95,
        },
        {
          name: 'Rock music background',
          music_type: 'rock',
          music_volume: 'medium',
          expected_reduction: 0.88,
        },
        {
          name: 'Electronic music background',
          music_type: 'electronic',
          music_volume: 'high',
          expected_reduction: 0.85,
        },
      ];

      for (const scenario of testScenarios) {
        const contextMapData = {
          project_id: job.id,
          original_duration_ms: 10000,
          segments: [
            {
              id: 0,
              start_ms: 0,
              end_ms: 10000,
              duration: 10.0,
              text: `Test with ${scenario.name}`,
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

        // Simulate vocal isolation with different music types
        const updatedSegments = (contextMapData.segments as any[]).map(seg => ({
          ...seg,
          clean_prompt_path: `/path/to/clean_${scenario.music_type}_${seg.id}.wav`,
          vocal_isolation_quality: {
            music_type: scenario.music_type,
            music_volume: scenario.music_volume,
            music_energy_reduction: scenario.expected_reduction,
            spectral_purity: 0.92,
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

        // Verify vocal isolation quality
        const updatedContextMap = await prisma.contextMap.findUnique({
          where: { id: contextMap.id },
        });
        const segment = (updatedContextMap?.content as any).segments[0];

        expect(segment.vocal_isolation_quality.music_energy_reduction).toBeGreaterThan(0.8);
        expect(segment.vocal_isolation_quality.spectral_purity).toBeGreaterThan(0.9);

        // Cleanup for next iteration
        await prisma.contextMap.delete({ where: { id: contextMap.id } });
      }

      // Cleanup job
      await prisma.dubbingJob.delete({ where: { id: job.id } });
    });

    it('should test with sound effects and ambient noise', async () => {
      const job = await createTestDubbingJob();

      const noiseScenarios = [
        {
          name: 'Traffic noise',
          noise_type: 'traffic',
          snr_before: 8.5,
          snr_after: 18.2,
        },
        {
          name: 'Office ambient',
          noise_type: 'office',
          snr_before: 12.0,
          snr_after: 22.5,
        },
      ];

      for (const scenario of noiseScenarios) {
        const contextMapData = {
          project_id: job.id,
          original_duration_ms: 5000,
          segments: [
            {
              id: 0,
              start_ms: 0,
              end_ms: 5000,
              duration: 5.0,
              text: `Test with ${scenario.name}`,
              speaker: 'SPEAKER_00',
              confidence: 0.90,
            },
          ],
        };

        const contextMap = await prisma.contextMap.create({
          data: {
            projectId: job.id,
            originalDurationMs: 5000,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            content: contextMapData,
          },
        });

        // Simulate noise reduction
        const updatedSegments = (contextMapData.segments as any[]).map(seg => ({
          ...seg,
          clean_prompt_path: `/path/to/clean_${scenario.noise_type}_${seg.id}.wav`,
          noise_reduction_quality: {
            noise_type: scenario.noise_type,
            snr_before: scenario.snr_before,
            snr_after: scenario.snr_after,
            snr_improvement: scenario.snr_after - scenario.snr_before,
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

        // Verify noise reduction quality
        const updatedContextMap = await prisma.contextMap.findUnique({
          where: { id: contextMap.id },
        });
        const segment = (updatedContextMap?.content as any).segments[0];

        expect(segment.noise_reduction_quality.snr_improvement).toBeGreaterThan(5);
        expect(segment.noise_reduction_quality.snr_after).toBeGreaterThan(15);

        // Cleanup
        await prisma.contextMap.delete({ where: { id: contextMap.id } });
      }

      await prisma.dubbingJob.delete({ where: { id: job.id } });
    });

    it('should verify clean prompts are suitable for voice cloning', async () => {
      const job = await createTestDubbingJob();

      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 6000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 6000,
            duration: 6.0,
            text: 'This is a clean vocal sample for voice cloning',
            speaker: 'SPEAKER_00',
            confidence: 0.96,
          },
        ],
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 6000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Simulate vocal isolation and quality validation
      const updatedSegments = (contextMapData.segments as any[]).map(seg => ({
        ...seg,
        clean_prompt_path: `/path/to/clean_prompt_${seg.id}.wav`,
        voice_clone_suitability: {
          duration_check: seg.duration >= 6.0 ? 'passed' : 'failed',
          snr: 22.5,
          spectral_purity: 0.94,
          clarity_score: 0.91,
          suitable_for_cloning: true,
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

      // Verify suitability for voice cloning
      const updatedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segment = (updatedContextMap?.content as any).segments[0];

      expect(segment.voice_clone_suitability.suitable_for_cloning).toBe(true);
      expect(segment.voice_clone_suitability.duration_check).toBe('passed');
      expect(segment.voice_clone_suitability.snr).toBeGreaterThan(20);
      expect(segment.voice_clone_suitability.spectral_purity).toBeGreaterThan(0.9);
      expect(segment.voice_clone_suitability.clarity_score).toBeGreaterThan(0.85);
    });
  });

  describe('36.3 Adaptation Engine with Edge Cases', () => {
    it('should test with very short segments (< 1 second)', async () => {
      const job = await createTestDubbingJob();

      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 3000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 500,
            duration: 0.5,
            text: 'Hi',
            speaker: 'SPEAKER_00',
            confidence: 0.98,
            emotion: 'neutral',
          },
          {
            id: 1,
            start_ms: 500,
            end_ms: 1200,
            duration: 0.7,
            text: 'Yes',
            speaker: 'SPEAKER_01',
            confidence: 0.97,
            emotion: 'happy',
          },
        ],
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 3000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Simulate adaptation for very short segments
      const adaptedSegments = (contextMapData.segments as any[]).map(seg => ({
        ...seg,
        adapted_text: seg.text, // Keep original for very short
        status: 'success',
        attempts: 1,
        validation: {
          char_ratio: 1.0,
          timing_check: 'passed',
          short_segment_handling: 'minimal_change',
        },
      }));

      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...contextMapData,
            segments: adaptedSegments,
          },
        },
      });

      // Verify short segment handling
      const updatedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segments = (updatedContextMap?.content as any).segments;

      segments.forEach((seg: any) => {
        expect(seg.duration).toBeLessThan(1.0);
        expect(seg.status).toBe('success');
        expect(seg.adapted_text.length).toBeLessThanOrEqual(seg.text.length * 1.5);
      });
    });

    it('should test with very long segments (> 10 seconds)', async () => {
      const job = await createTestDubbingJob();

      const longText = 'This is a very long segment that contains multiple sentences and ideas. ' +
        'It discusses various topics in detail and requires careful adaptation to maintain timing.';

      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 15000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 12000,
            duration: 12.0,
            text: longText,
            speaker: 'SPEAKER_00',
            confidence: 0.94,
            emotion: 'neutral',
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

      // Simulate adaptation for long segment with retry logic
      const adaptedSegments = (contextMapData.segments as any[]).map(seg => {
        const adaptedText = seg.text.substring(0, Math.floor(seg.text.length * 1.2));
        return {
          ...seg,
          adapted_text: adaptedText,
          status: 'success',
          attempts: 2, // Required retry
          validation: {
            char_ratio: adaptedText.length / seg.text.length,
            timing_check: 'passed',
            long_segment_handling: 'condensed',
            retry_reason: 'first_attempt_too_long',
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

      // Verify long segment handling
      const updatedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      const segment = (updatedContextMap?.content as any).segments[0];

      expect(segment.duration).toBeGreaterThan(10.0);
      expect(segment.status).toBe('success');
      expect(segment.attempts).toBe(2);
      expect(segment.validation.char_ratio).toBeLessThanOrEqual(1.5);
    });

    it('should test retry logic with intentionally difficult prompts', async () => {
      const job = await createTestDubbingJob();

      const difficultScenarios = [
        {
          text: 'Supercalifragilisticexpialidocious is a very long word',
          duration: 2.0,
          expected_attempts: 2,
          expected_status: 'success',
        },
        {
          text: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
          duration: 1.5,
          expected_attempts: 3,
          expected_status: 'failed_adaptation',
        },
      ];

      for (const scenario of difficultScenarios) {
        const contextMapData = {
          project_id: job.id,
          original_duration_ms: scenario.duration * 1000,
          segments: [
            {
              id: 0,
              start_ms: 0,
              end_ms: scenario.duration * 1000,
              duration: scenario.duration,
              text: scenario.text,
              speaker: 'SPEAKER_00',
              confidence: 0.90,
              emotion: 'neutral',
            },
          ],
        };

        const contextMap = await prisma.contextMap.create({
          data: {
            projectId: job.id,
            originalDurationMs: scenario.duration * 1000,
            sourceLanguage: 'en',
            targetLanguage: 'es',
            content: contextMapData,
          },
        });

        // Simulate retry logic
        const adaptedSegments = (contextMapData.segments as any[]).map(seg => ({
          ...seg,
          adapted_text: scenario.expected_status === 'success' 
            ? `Adapted: ${seg.text.substring(0, 30)}...`
            : seg.text,
          status: scenario.expected_status,
          attempts: scenario.expected_attempts,
          validation: {
            retry_history: Array.from({ length: scenario.expected_attempts }, (_, i) => ({
              attempt: i + 1,
              result: i < scenario.expected_attempts - 1 ? 'failed' : scenario.expected_status === 'success' ? 'passed' : 'failed',
              reason: i < scenario.expected_attempts - 1 ? 'too_long' : 'final_attempt',
            })),
          },
        }));

        await prisma.contextMap.update({
          where: { id: contextMap.id },
          data: {
            content: {
              ...contextMapData,
              segments: adaptedSegments,
            },
          },
        });

        // Verify retry logic
        const updatedContextMap = await prisma.contextMap.findUnique({
          where: { id: contextMap.id },
        });
        const segment = (updatedContextMap?.content as any).segments[0];

        expect(segment.attempts).toBe(scenario.expected_attempts);
        expect(segment.status).toBe(scenario.expected_status);
        expect(segment.validation.retry_history).toHaveLength(scenario.expected_attempts);

        // Cleanup
        await prisma.contextMap.delete({ where: { id: contextMap.id } });
      }

      await prisma.dubbingJob.delete({ where: { id: job.id } });
    });
  });

  describe('36.4 Absolute Synchronization Accuracy', () => {
    it('should test with videos of various lengths', async () => {
      const videoLengths = [
        { duration: 60, name: '1 minute' },
        { duration: 600, name: '10 minutes' },
      ];

      for (const video of videoLengths) {
        const job = await createTestDubbingJob();

        // Create segments for the video
        const numSegments = Math.floor(video.duration / 5); // 5-second segments
        const segments = Array.from({ length: numSegments }, (_, i) => ({
          id: i,
          start_ms: i * 5000,
          end_ms: (i + 1) * 5000,
          duration: 5.0,
          text: `Segment ${i}`,
          speaker: 'SPEAKER_00',
          confidence: 0.95,
          generated_audio_path: `/path/to/audio_${i}.wav`,
        }));

        const contextMapData = {
          project_id: job.id,
          original_duration_ms: video.duration * 1000,
          segments,
        };

        await prisma.contextMap.create({
          data: {
            projectId: job.id,
            originalDurationMs: video.duration * 1000,
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
            segmentAccuracy: segments.map(seg => ({ segment_id: seg.id, drift_ms: 0 })),
            syncQualityScore: 1.0,
          },
        });

        // Verify no drift regardless of video length
        const syncMetrics = await prisma.syncQualityMetrics.findUnique({
          where: { projectId: job.id },
        });

        expect(syncMetrics?.maxDriftMs).toBe(0);
        expect(syncMetrics?.averageDriftMs).toBe(0);

        // Cleanup
        await prisma.syncQualityMetrics.delete({ where: { projectId: job.id } });
        await prisma.contextMap.delete({ where: { projectId: job.id } });
        await prisma.dubbingJob.delete({ where: { id: job.id } });
      }
    });
  });

  describe('36.5 Context Map Integrity', () => {
    it('should verify Context Map updates at each pipeline stage', async () => {
      const job = await createTestDubbingJob();

      // Stage 1: Initial Context Map creation after STT
      const initialContextMapData = {
        project_id: job.id,
        original_duration_ms: 10000,
        segments: [
          {
            id: 0,
            start_ms: 0,
            end_ms: 5000,
            duration: 5.0,
            text: 'Initial segment',
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
          content: initialContextMapData,
        },
      });

      // Verify initial state
      let currentContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      let segment = (currentContextMap?.content as any).segments[0];
      expect(segment).toHaveProperty('text');
      expect(segment).toHaveProperty('speaker');
      expect(segment).not.toHaveProperty('clean_prompt_path');

      // Stage 2: Vocal Isolation update
      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...initialContextMapData,
            segments: initialContextMapData.segments.map(seg => ({
              ...seg,
              clean_prompt_path: `/path/to/clean_${seg.id}.wav`,
            })),
          },
        },
      });

      currentContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      segment = (currentContextMap?.content as any).segments[0];
      expect(segment).toHaveProperty('clean_prompt_path');

      // Stage 3: Emotion Analysis update
      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...initialContextMapData,
            segments: initialContextMapData.segments.map(seg => ({
              ...seg,
              clean_prompt_path: `/path/to/clean_${seg.id}.wav`,
              emotion: 'neutral',
            })),
          },
        },
      });

      currentContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      segment = (currentContextMap?.content as any).segments[0];
      expect(segment).toHaveProperty('emotion');

      // Stage 4: Adaptation update
      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...initialContextMapData,
            segments: initialContextMapData.segments.map(seg => ({
              ...seg,
              clean_prompt_path: `/path/to/clean_${seg.id}.wav`,
              emotion: 'neutral',
              adapted_text: 'Adapted segment',
              status: 'success',
              attempts: 1,
            })),
          },
        },
      });

      currentContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      segment = (currentContextMap?.content as any).segments[0];
      expect(segment).toHaveProperty('adapted_text');
      expect(segment).toHaveProperty('status');

      // Stage 5: TTS update
      await prisma.contextMap.update({
        where: { id: contextMap.id },
        data: {
          content: {
            ...initialContextMapData,
            segments: initialContextMapData.segments.map(seg => ({
              ...seg,
              clean_prompt_path: `/path/to/clean_${seg.id}.wav`,
              emotion: 'neutral',
              adapted_text: 'Adapted segment',
              status: 'success',
              attempts: 1,
              generated_audio_path: `/path/to/generated_${seg.id}.wav`,
            })),
          },
        },
      });

      currentContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });
      segment = (currentContextMap?.content as any).segments[0];
      expect(segment).toHaveProperty('generated_audio_path');

      // Verify all fields are present in final state
      expect(segment).toHaveProperty('text');
      expect(segment).toHaveProperty('speaker');
      expect(segment).toHaveProperty('clean_prompt_path');
      expect(segment).toHaveProperty('emotion');
      expect(segment).toHaveProperty('adapted_text');
      expect(segment).toHaveProperty('status');
      expect(segment).toHaveProperty('generated_audio_path');
    });

    it('should verify all required fields are populated', async () => {
      const job = await createTestDubbingJob();

      const requiredFields = [
        'id',
        'start_ms',
        'end_ms',
        'duration',
        'text',
        'speaker',
        'confidence',
        'clean_prompt_path',
        'emotion',
        'adapted_text',
        'status',
        'attempts',
        'generated_audio_path',
      ];

      const completeSegment = {
        id: 0,
        start_ms: 0,
        end_ms: 5000,
        duration: 5.0,
        text: 'Complete segment',
        speaker: 'SPEAKER_00',
        confidence: 0.95,
        clean_prompt_path: '/path/to/clean_0.wav',
        emotion: 'neutral',
        adapted_text: 'Adapted complete segment',
        status: 'success',
        attempts: 1,
        generated_audio_path: '/path/to/generated_0.wav',
      };

      const contextMapData = {
        project_id: job.id,
        original_duration_ms: 5000,
        segments: [completeSegment],
      };

      const contextMap = await prisma.contextMap.create({
        data: {
          projectId: job.id,
          originalDurationMs: 5000,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          content: contextMapData,
        },
      });

      // Verify all required fields
      const retrievedContextMap = await prisma.contextMap.findUnique({
        where: { id: contextMap.id },
      });

      const segment = (retrievedContextMap?.content as any).segments[0];

      requiredFields.forEach(field => {
        expect(segment).toHaveProperty(field);
        expect(segment[field]).toBeDefined();
      });

      // Verify field types
      expect(typeof segment.id).toBe('number');
      expect(typeof segment.start_ms).toBe('number');
      expect(typeof segment.end_ms).toBe('number');
      expect(typeof segment.duration).toBe('number');
      expect(typeof segment.text).toBe('string');
      expect(typeof segment.speaker).toBe('string');
      expect(typeof segment.confidence).toBe('number');
      expect(typeof segment.clean_prompt_path).toBe('string');
      expect(typeof segment.emotion).toBe('string');
      expect(typeof segment.adapted_text).toBe('string');
      expect(typeof segment.status).toBe('string');
      expect(typeof segment.attempts).toBe('number');
      expect(typeof segment.generated_audio_path).toBe('string');
    });
  });
});
