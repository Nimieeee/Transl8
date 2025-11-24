import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SilenceDetection {
  startSilence: number;  // Duration of silence at start (seconds)
  endSilence: number;    // Duration of silence at end (seconds)
  speechStart: number;   // When speech actually starts (seconds)
  speechEnd: number;     // When speech actually ends (seconds)
  speechDuration: number; // Duration of actual speech (seconds)
  totalDuration: number;  // Total audio duration (seconds)
}

export class AudioAnalyzer {
  /**
   * Detect silence at the beginning and end of audio file
   * Uses FFmpeg's silencedetect filter
   */
  async detectSilence(audioPath: string, silenceThreshold: number = -30): Promise<SilenceDetection> {
    try {
      // First get total duration
      const { stdout: durationOutput } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const totalDuration = parseFloat(durationOutput.trim());

      // Detect silence periods
      // silencedetect: noise=-30dB (adjust threshold as needed)
      // d=0.5 means minimum 0.5 seconds of silence to detect
      const { stderr } = await execAsync(
        `ffmpeg -i "${audioPath}" -af silencedetect=noise=${silenceThreshold}dB:d=0.3 -f null - 2>&1`
      );

      // Parse silence detection output
      const silenceStarts: number[] = [];
      const silenceEnds: number[] = [];

      const startMatches = stderr.matchAll(/silence_start: ([\d.]+)/g);
      const endMatches = stderr.matchAll(/silence_end: ([\d.]+)/g);

      for (const match of startMatches) {
        silenceStarts.push(parseFloat(match[1]));
      }

      for (const match of endMatches) {
        silenceEnds.push(parseFloat(match[1]));
      }

      // Determine start and end silence
      let startSilence = 0;
      let speechStart = 0;
      let speechEnd = totalDuration;
      let endSilence = 0;

      // Check if there's silence at the very beginning (starts near 0)
      if (silenceStarts.length > 0 && silenceStarts[0] < 0.5) {
        // There's silence at the start
        if (silenceEnds.length > 0) {
          startSilence = silenceEnds[0];
          speechStart = silenceEnds[0];
        }
      }

      // Check if there's silence at the very end
      if (silenceStarts.length > 0) {
        const lastSilenceStart = silenceStarts[silenceStarts.length - 1];
        // If silence starts near the end
        if (lastSilenceStart > totalDuration - 2) {
          speechEnd = lastSilenceStart;
          endSilence = totalDuration - lastSilenceStart;
        }
      }

      const speechDuration = speechEnd - speechStart;

      console.log('Silence detection results:');
      console.log(`  Total duration: ${totalDuration.toFixed(2)}s`);
      console.log(`  Start silence: ${startSilence.toFixed(2)}s`);
      console.log(`  Speech: ${speechStart.toFixed(2)}s - ${speechEnd.toFixed(2)}s (${speechDuration.toFixed(2)}s)`);
      console.log(`  End silence: ${endSilence.toFixed(2)}s`);

      return {
        startSilence,
        endSilence,
        speechStart,
        speechEnd,
        speechDuration,
        totalDuration
      };
    } catch (error) {
      console.error('Silence detection error:', error);
      // Fallback: assume no silence
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const totalDuration = parseFloat(stdout.trim());
      
      return {
        startSilence: 0,
        endSilence: 0,
        speechStart: 0,
        speechEnd: totalDuration,
        speechDuration: totalDuration,
        totalDuration
      };
    }
  }

  /**
   * Add silence to the beginning and/or end of an audio file
   */
  async addSilence(
    inputPath: string,
    outputPath: string,
    startSilence: number,
    endSilence: number
  ): Promise<string> {
    try {
      console.log(`Adding silence: ${startSilence.toFixed(2)}s at start, ${endSilence.toFixed(2)}s at end`);

      // Build FFmpeg filter
      const filters: string[] = [];
      
      if (startSilence > 0) {
        filters.push(`adelay=${Math.round(startSilence * 1000)}|${Math.round(startSilence * 1000)}`);
      }
      
      if (endSilence > 0) {
        filters.push(`apad=pad_dur=${endSilence}`);
      }

      if (filters.length === 0) {
        // No silence to add, just copy
        await execAsync(`cp "${inputPath}" "${outputPath}"`);
        return outputPath;
      }

      const filterString = filters.join(',');
      
      await execAsync(
        `ffmpeg -i "${inputPath}" -af "${filterString}" -c:a aac "${outputPath}"`
      );

      console.log(`Silence added successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Add silence error:', error);
      throw error;
    }
  }
}
