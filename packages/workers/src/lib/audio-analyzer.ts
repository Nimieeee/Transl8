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

      // Check if there's silence at the very beginning (starts at or near 0)
      if (silenceStarts.length > 0 && silenceStarts[0] < 0.1) {
        // There's silence at the start
        if (silenceEnds.length > 0 && silenceEnds[0] > 0.1) {
          startSilence = silenceEnds[0];
          speechStart = silenceEnds[0];
          console.log(`Detected start silence: 0s - ${startSilence.toFixed(2)}s`);
        }
      }

      // Check if there's silence at the very end
      // Look for the last silence period that extends to near the end
      if (silenceStarts.length > 0) {
        const lastSilenceStart = silenceStarts[silenceStarts.length - 1];
        // If this silence period extends close to the end of the audio
        if (lastSilenceStart > totalDuration - 3 && lastSilenceStart > speechStart + 1) {
          speechEnd = lastSilenceStart;
          endSilence = totalDuration - lastSilenceStart;
          console.log(`Detected end silence: ${speechEnd.toFixed(2)}s - ${totalDuration.toFixed(2)}s`);
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

      if (startSilence === 0 && endSilence === 0) {
        // No silence to add, just copy
        await execAsync(`cp "${inputPath}" "${outputPath}"`);
        return outputPath;
      }

      // Use anullsrc to generate silence and concat with audio
      // This is more reliable than adelay for precise timing
      let filterComplex = '';
      
      if (startSilence > 0 && endSilence > 0) {
        // Add silence at both start and end
        filterComplex = `anullsrc=r=44100:cl=stereo:d=${startSilence}[s1];` +
                       `anullsrc=r=44100:cl=stereo:d=${endSilence}[s2];` +
                       `[s1][0:a][s2]concat=n=3:v=0:a=1[out]`;
      } else if (startSilence > 0) {
        // Add silence only at start
        filterComplex = `anullsrc=r=44100:cl=stereo:d=${startSilence}[s1];` +
                       `[s1][0:a]concat=n=2:v=0:a=1[out]`;
      } else {
        // Add silence only at end
        filterComplex = `anullsrc=r=44100:cl=stereo:d=${endSilence}[s2];` +
                       `[0:a][s2]concat=n=2:v=0:a=1[out]`;
      }
      
      await execAsync(
        `ffmpeg -i "${inputPath}" -filter_complex "${filterComplex}" -map "[out]" -c:a aac "${outputPath}"`
      );

      console.log(`Silence added successfully: ${outputPath}`);
      
      // Verify the output duration
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
      );
      const finalDuration = parseFloat(stdout.trim());
      console.log(`Final audio duration: ${finalDuration.toFixed(2)}s`);
      
      return outputPath;
    } catch (error) {
      console.error('Add silence error:', error);
      throw error;
    }
  }
}
