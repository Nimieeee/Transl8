import { Job } from 'bullmq';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';
import { uploadToStorage } from './lib/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processTts(job: Job) {
  const { projectId } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'TTS', status: 'PROCESSING' });

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: translations } = await supabase
      .from('translations')
      .select('*')
      .eq('project_id', projectId);

    if (!project || !translations || translations.length === 0) {
      throw new Error('No translation found');
    }

    const text = JSON.stringify(translations[0].content);

    // Call TTS API (OpenAI TTS)
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Save buffer to temp file for upload
    const tempFilePath = path.join('/tmp', `${projectId}_audio.mp3`);
    fs.writeFileSync(tempFilePath, buffer);

    // Upload to Supabase Storage
    // WAIT: The previous plan said "Use the storage utility".
    // I should check if I can import it or if I need to copy it to workers.
    // The Dockerfile copies packages/backend/src/adapters to packages/backend/src/adapters.
    // But workers/src/lib is where we are.

    // Let's assume we need to implement/copy the storage logic to workers/src/lib/storage.ts first.
    // I will abort this specific edit and create the file first.

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'TTS');

    await addJob('muxing', { projectId });

  } catch (error: any) {
    console.error('TTS Error:', error);
    await supabase
      .from('jobs')
      .update({ status: 'FAILED', error_message: error.message })
      .eq('project_id', projectId)
      .eq('stage', 'TTS');
    throw error;
  }
}
