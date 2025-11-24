import { Job } from 'bullmq';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';

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

    console.log('Audio extracted, sending to OpenAI Whisper...');

    // Call OpenAI Whisper API with audio file
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempAudioPath),
      model: 'whisper-1',
      language: sourceLanguage || 'en',
      response_format: 'verbose_json',
    });

    await supabase
      .from('transcripts')
      .insert({
        project_id: projectId,
        content: transcription as any,
        approved: false
      });

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'STT');

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
