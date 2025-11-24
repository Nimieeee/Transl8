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

    // Save buffer to temp file
    const tempFilePath = path.join('/tmp', `${projectId}_audio.mp3`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log('Audio generated, uploading to storage...');

    // Upload to Supabase Storage
    const audioUrl = await uploadToStorage(tempFilePath, `projects/${projectId}/audio`);

    console.log('Audio uploaded:', audioUrl);

    // Update project with audio URL
    await supabase
      .from('projects')
      .update({ audio_url: audioUrl })
      .eq('id', projectId);

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'TTS');

    await addJob('muxing', { projectId, audioUrl });

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
