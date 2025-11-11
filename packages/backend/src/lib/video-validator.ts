import ffmpeg from 'fluent-ffmpeg';

export interface VideoMetadata {
  duration: number; // in seconds
  format: string;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
  hasAudio: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  metadata?: VideoMetadata;
}

const ALLOWED_FORMATS = ['mp4', 'mov'];
const MAX_DURATION_SECONDS = 300; // 5 minutes for MVP
const MAX_FILE_SIZE_MB = 500; // 500 MB

/**
 * Validate video file format and duration
 */
export async function validateVideo(filePath: string, fileSize: number): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check file size
  const fileSizeMB = fileSize / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`);
  }

  try {
    const metadata = await getVideoMetadata(filePath);

    // Validate format
    if (!ALLOWED_FORMATS.includes(metadata.format.toLowerCase())) {
      errors.push(
        `Invalid video format: ${metadata.format}. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`
      );
    }

    // Validate duration
    if (metadata.duration > MAX_DURATION_SECONDS) {
      const maxMinutes = Math.floor(MAX_DURATION_SECONDS / 60);
      const actualMinutes = Math.floor(metadata.duration / 60);
      const actualSeconds = Math.floor(metadata.duration % 60);
      errors.push(
        `Video duration (${actualMinutes}m ${actualSeconds}s) exceeds maximum allowed duration of ${maxMinutes} minutes`
      );
    }

    // Check if video has audio
    if (!metadata.hasAudio) {
      errors.push('Video must contain an audio track');
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata,
    };
  } catch (error) {
    errors.push(
      `Failed to validate video: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {
      valid: false,
      errors,
    };
  }
}

/**
 * Extract video metadata using ffmpeg
 */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const duration = metadata.format.duration || 0;
      const format = metadata.format.format_name?.split(',')[0] || 'unknown';

      resolve({
        duration,
        format,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(String(metadata.format.bit_rate || '0'), 10),
        fps: eval(videoStream.r_frame_rate || '0') || 0,
        hasAudio: !!audioStream,
      });
    });
  });
}

/**
 * Extract audio from video file
 */
export async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .noVideo()
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
