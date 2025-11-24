import { Job } from 'bullmq';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';
import { AudioAnalyzer } from './lib/audio-analyzer';

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processStt(job: Job) {
  const { projectId, videoUrl, sourceLanguage } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'STT', status: 'PROCESSING' });

  const tempVideoPath = path.join('/tmp', `${projectId}_input.mp4`);
  const tempAudioPath = path.join('/tmp', `${projectId}_audio.mp3`);

  try {
    console.log(`Downloading video from: ${videoUrl}`);
    
    // Download video file
    const response = await axios.get(videoUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(tempVideoPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    console.log('Video downloaded, extracting audio...');

    // Extract audio using ffmpeg
    await execAsync(`ffmpeg -i "${tempVideoPath}" -vn -acodec libmp3lame -q:a 2 "${tempAudioPath}"`);

    console.log('Audio extracted, analyzing for silence...');

    // Detect silence at beginning and end
    const analyzer = new AudioAnalyzer();
    const silenceInfo = await analyzer.detectSilence(tempAudioPath);

    console.log('Silence analysis complete, sending to OpenAI Whisper...');

    // Call OpenAI Whisper API with audio file
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempAudioPath),
      model: 'whisper-1',
      language: sourceLanguage || 'en',
      response_format: 'verbose_json',
    });

    console.log('Transcription received:', JSON.stringify(transcription).substring(0, 200));

    // Add silence information to transcription
    const transcriptionWithSilence = {
      ...transcription,
      silence: {
        startSilence: silenceInfo.startSilence,
        endSilence: silenceInfo.endSilence,
        speechStart: silenceInfo.speechStart,
        speechEnd: silenceInfo.speechEnd,
        speechDuration: silenceInfo.speechDuration,
        totalDuration: silenceInfo.totalDuration
      }
    };

    console.log(`Speech duration: ${silenceInfo.speechDuration.toFixed(2)}s (excluding ${silenceInfo.startSilence.toFixed(2)}s start + ${silenceInfo.endSilence.toFixed(2)}s end silence)`);

    // Save transcript to database
    const { data: savedTranscript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        project_id: projectId,
        content: transcriptionWithSilence as any,
        approved: false
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Failed to save transcript:', transcriptError);
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Transcript saved successfully:', savedTranscript.id);

    // Update job status
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'STT');

    if (jobError) {
      console.error('Failed to update job status:', jobError);
    }

    console.log('STT completed, triggering translation...');

    // Trigger next stage
    await addJob('translation', { projectId });

  } catch (error: any) {
    console.error('STT Error:', error);
    await supabase
      .from('jobs')
      .update({ status: 'FAILED', error_message: error.message })
      .eq('project_id', projectId)
      .eq('stage', 'STT');
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(tempVideoPath)) {
      fs.unlinkSync(tempVideoPath);
    }
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
  }
}
