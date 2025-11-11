/**
 * Example usage of VideoProcessor class
 * This file demonstrates how to use the video processing functionality
 */

import { videoProcessor } from './video-processor';
import path from 'path';

async function exampleUsage() {
  // Example 1: Extract audio from video
  const videoPath = '/path/to/input/video.mp4';
  const audioOutputPath = '/path/to/output/audio.wav';

  try {
    const extractedAudio = await videoProcessor.extractAudio(videoPath, audioOutputPath);
    console.log('Audio extracted to:', extractedAudio);
  } catch (error) {
    console.error('Audio extraction failed:', error);
  }

  // Example 2: Mux video with new audio (without watermark)
  const newAudioPath = '/path/to/dubbed/audio.wav';
  const outputVideoPath = '/path/to/output/dubbed-video.mp4';

  try {
    const muxedVideo = await videoProcessor.muxAudioVideo(
      videoPath,
      newAudioPath,
      outputVideoPath,
      { applyWatermark: false }
    );
    console.log('Video muxed to:', muxedVideo);
  } catch (error) {
    console.error('Video muxing failed:', error);
  }

  // Example 3: Mux video with watermark (for free-tier users)
  const watermarkedOutputPath = '/path/to/output/watermarked-video.mp4';

  try {
    const watermarkedVideo = await videoProcessor.muxAudioVideo(
      videoPath,
      newAudioPath,
      watermarkedOutputPath,
      {
        applyWatermark: true,
        watermarkText: 'Preview - Upgrade to remove watermark',
      }
    );
    console.log('Watermarked video created:', watermarkedVideo);
  } catch (error) {
    console.error('Watermarked video creation failed:', error);
  }

  // Example 4: Get video metadata
  try {
    const metadata = await videoProcessor.getVideoMetadata(videoPath);
    console.log('Video metadata:', {
      duration: `${metadata.duration} seconds`,
      resolution: `${metadata.width}x${metadata.height}`,
      codec: metadata.codec,
      format: metadata.format,
    });
  } catch (error) {
    console.error('Failed to get metadata:', error);
  }

  // Example 5: Validate FFmpeg availability
  const isAvailable = await videoProcessor.validateFFmpegAvailable();
  console.log('FFmpeg available:', isAvailable);
}

// Integration with job processing workflow
async function processVideoJob(projectId: string, subscriptionTier: string) {
  const projectDir = `/tmp/projects/${projectId}`;
  const videoPath = path.join(projectDir, 'original.mp4');
  const audioPath = path.join(projectDir, 'audio.wav');
  const dubbedAudioPath = path.join(projectDir, 'dubbed-audio.wav');
  const outputPath = path.join(projectDir, 'final-video.mp4');

  try {
    // Step 1: Extract audio for STT processing
    console.log('Extracting audio from video...');
    await videoProcessor.extractAudio(videoPath, audioPath);

    // Step 2: After TTS generates dubbed audio, mux it back
    console.log('Muxing dubbed audio with video...');
    const applyWatermark = subscriptionTier === 'free';

    await videoProcessor.muxAudioVideo(videoPath, dubbedAudioPath, outputPath, {
      applyWatermark,
      watermarkText: applyWatermark ? 'Preview - Upgrade to remove watermark' : undefined,
    });

    console.log('Video processing completed:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Video processing failed:', error);
    throw error;
  }
}

export { exampleUsage, processVideoJob };
