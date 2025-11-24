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
    console.log(`TTS worker started for project ${projectId}`);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    console.log('Project found, fetching translations...');

    const { data: translations, error: translationError } = await supabase
      .from('translations')
      .select('*')
      .eq('project_id', projectId);

    if (translationError) {
      console.error('Translation fetch error:', translationError);
      throw new Error(`Failed to fetch translations: ${translationError.message}`);
    }

    if (!translations || translations.length === 0) {
      console.error('No translations found for project:', projectId);
      throw new Error('No translation found - translation may have failed');
    }

    console.log(`Found ${translations.length} translation(s)`);

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
