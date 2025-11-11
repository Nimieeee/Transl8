/**
 * OpenAI Whisper API Adapter
 *
 * Uses OpenAI's Whisper API for speech-to-text transcription
 * instead of running a local Whisper model.
 *
 * Note: OpenAI Whisper API does not support speaker diarization.
 * All segments will be labeled as SPEAKER_00.
 */

import {
  STTAdapter,
  STTResult,
  Transcript,
  TranscriptSegment,
  WordTiming,
  HealthCheckResult,
  AdapterMetadata,
} from './types';
import OpenAI from 'openai';
import fs from 'fs';

export class OpenAIWhisperAdapter extends STTAdapter {
  name = 'openai-whisper';
  version = '1.0.0';
  private client: OpenAI;

  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Merge segments that are too short or appear to be mid-sentence splits
   * This prevents repetition in translation
   */
  private mergeShortSegments(segments: any[]): any[] {
    if (segments.length === 0) return segments;

    const merged: any[] = [];
    const MIN_SEGMENT_DURATION = 2.0; // Minimum 2 seconds per segment
    const MAX_GAP = 0.5; // Maximum 0.5 second gap between segments to merge

    let currentSegment = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      const currentDuration = currentSegment.end - currentSegment.start;
      const gap = nextSegment.start - currentSegment.end;

      // Merge if:
      // 1. Current segment is too short (< 2 seconds)
      // 2. Gap between segments is very small (< 0.5 seconds)
      // 3. Current segment ends mid-word (doesn't end with punctuation)
      const shouldMerge =
        currentDuration < MIN_SEGMENT_DURATION ||
        gap < MAX_GAP ||
        !this.endsWithPunctuation(currentSegment.text);

      if (shouldMerge) {
        // Merge segments
        currentSegment.end = nextSegment.end;
        currentSegment.text = currentSegment.text + ' ' + nextSegment.text;
        if (currentSegment.words && nextSegment.words) {
          currentSegment.words = [...currentSegment.words, ...nextSegment.words];
        }
      } else {
        // Save current segment and start new one
        merged.push(currentSegment);
        currentSegment = { ...nextSegment };
      }
    }

    // Add the last segment
    merged.push(currentSegment);

    return merged;
  }

  /**
   * Check if text ends with sentence-ending punctuation
   */
  private endsWithPunctuation(text: string): boolean {
    const trimmed = text.trim();
    return /[.!?。！？]$/.test(trimmed);
  }

  async transcribe(audioPath: string, language: string): Promise<STTResult> {
    const startTime = Date.now();

    try {
      // Create a read stream for the audio file
      const audioFile = fs.createReadStream(audioPath);

      // Call OpenAI Whisper API with verbose JSON format
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || undefined,
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
      });

      // Process segments
      const segments: TranscriptSegment[] = [];
      let duration = 0;

      if ('segments' in response && Array.isArray(response.segments)) {
        // First, collect all raw segments
        const rawSegments: any[] = [];
        for (let i = 0; i < response.segments.length; i++) {
          const segment: any = response.segments[i];

          // Process word timings if available
          const words: WordTiming[] | undefined = segment.words?.map((word: any) => ({
            word: word.word,
            start: word.start,
            end: word.end,
            confidence: 0.95,
          }));

          rawSegments.push({
            start: segment.start,
            end: segment.end,
            text: segment.text.trim(),
            words,
          });

          // Track duration
          if (segment.end > duration) {
            duration = segment.end;
          }
        }

        // Merge segments that are too short or split mid-sentence
        const mergedSegments = this.mergeShortSegments(rawSegments);

        // Convert to final format
        for (let i = 0; i < mergedSegments.length; i++) {
          segments.push({
            id: i,
            start: mergedSegments[i].start,
            end: mergedSegments[i].end,
            text: mergedSegments[i].text,
            speaker: 'SPEAKER_00',
            confidence: 0.95,
            words: mergedSegments[i].words,
          });
        }
      }

      const transcript: Transcript = {
        text: response.text,
        duration,
        language: language || 'en',
        segments,
        speakerCount: 1, // OpenAI Whisper doesn't do diarization
      };

      const metadata: AdapterMetadata = {
        processingTime: Date.now() - startTime,
        modelName: 'whisper-1',
        modelVersion: this.version,
        confidence: 0.95,
        warnings: [
          'OpenAI Whisper API does not support speaker diarization. All segments labeled as SPEAKER_00.',
        ],
      };

      return {
        transcript,
        metadata,
      };
    } catch (error: any) {
      throw new Error(`OpenAI Whisper transcription failed: ${error.message}`);
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple check to see if we can access the API
      await this.client.models.retrieve('whisper-1');

      return {
        healthy: true,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
