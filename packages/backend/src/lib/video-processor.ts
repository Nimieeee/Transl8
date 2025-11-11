import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * VideoProcessor handles FFmpeg operations for video and audio processing
 * Supports audio extraction, video-audio muxing, and watermarking
 */
export class VideoProcessor {
  /**
   * Extract audio track from video file as 16kHz PCM WAV
   * @param videoPath - Path to input video file
   * @param outputPath - Path for output audio file
   * @returns Promise resolving to output audio file path
   */
  async extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdir(outputDir, { recursive: true }).catch(() => {
        // Directory might already exist, ignore error
      });

      ffmpeg(videoPath)
        .noVideo() // Remove video stream
        .audioCodec('pcm_s16le') // 16-bit PCM
        .audioFrequency(16000) // 16kHz sample rate
        .audioChannels(1) // Mono channel
        .format('wav') // WAV container
        .on('start', (commandLine) => {
          console.log('FFmpeg audio extraction started:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Audio extraction progress: ${progress.percent.toFixed(2)}%`);
          }
        })
        .on('end', () => {
          console.log('Audio extraction completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err, _stdout, stderr) => {
          console.error('FFmpeg audio extraction error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Combine video with new audio track and optionally add watermark
   * @param videoPath - Path to input video file
   * @param audioPath - Path to new audio file
   * @param outputPath - Path for output video file
   * @param options - Processing options
   * @returns Promise resolving to output video file path
   */
  async muxAudioVideo(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    options: {
      applyWatermark?: boolean;
      watermarkText?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdir(outputDir, { recursive: true }).catch(() => {
        // Directory might already exist, ignore error
      });

      const command = ffmpeg();

      // Add video input (without audio)
      command.input(videoPath);

      // Add audio input
      command.input(audioPath);

      // Map video from first input, audio from second input
      command.outputOptions([
        '-map 0:v:0', // Video from first input
        '-map 1:a:0', // Audio from second input
        '-c:v libx264', // H.264 video codec for web compatibility
        '-preset fast', // Encoding speed/quality tradeoff
        '-crf 23', // Constant Rate Factor (quality: 0-51, lower is better)
        '-c:a aac', // AAC audio codec for web compatibility
        '-b:a 128k', // Audio bitrate
        '-movflags +faststart', // Enable streaming (move moov atom to beginning)
        '-shortest', // Finish encoding when shortest input ends
      ]);

      // Add watermark if requested
      if (options.applyWatermark) {
        const watermarkText = options.watermarkText || 'Preview - Upgrade to remove watermark';
        const filterComplex = [
          `drawtext=text='${watermarkText.replace(/'/g, "\\'")}':`,
          'fontsize=24:',
          'fontcolor=white@0.7:',
          'box=1:',
          'boxcolor=black@0.5:',
          'boxborderw=5:',
          'x=(w-text_w)/2:',
          'y=h-th-20',
        ].join('');

        command.complexFilter(filterComplex);
      }

      command
        .on('start', (commandLine) => {
          console.log('FFmpeg muxing started:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Muxing progress: ${progress.percent.toFixed(2)}%`);
          }
        })
        .on('end', () => {
          console.log('Video muxing completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err, _stdout, stderr) => {
          console.error('FFmpeg muxing error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Video muxing failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Get video metadata (duration, codec, resolution, etc.)
   * @param videoPath - Path to video file
   * @returns Promise resolving to video metadata
   */
  async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown',
          format: metadata.format.format_name || 'unknown',
        });
      });
    });
  }

  /**
   * Validate that FFmpeg is available in the system
   * @returns Promise resolving to true if FFmpeg is available
   */
  async validateFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, _formats) => {
        if (err) {
          console.error('FFmpeg not available:', err.message);
          resolve(false);
        } else {
          console.log('FFmpeg is available');
          resolve(true);
        }
      });
    });
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor();
