import { Job } from 'bullmq';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processStt(job: Job) {
  const { projectId, videoUrl } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'STT', status: 'PROCESSING' });

  const tempFilePath = path.join('/tmp', `${projectId}_input.mp4`);

  try {
    // Download file to temp
    const response = await axios.get(videoUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
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
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
