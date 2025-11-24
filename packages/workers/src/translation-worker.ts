import { Job } from 'bullmq';
import { Mistral } from '@mistralai/mistralai';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';
import { DurationValidator } from './lib/duration-validator';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const MAX_RETRIES = 3;

// Initialize duration validator
const validator = new DurationValidator(
  0.15, // 15% tolerance
  3,    // max 3 retries
  'alloy', // OpenAI TTS voice
  'mistral-small-latest'
);

export async function processTranslation(job: Job) {
  const { projectId } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'MT', status: 'PROCESSING' });

  try {
    console.log(`Translation worker started for project ${projectId}`);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      throw new Error(`Project not found: ${projectError?.message || 'Unknown error'}`);
    }

    console.log('Project found, fetching transcripts...');

    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('project_id', projectId);

    if (transcriptError) {
      console.error('Transcript fetch error:', transcriptError);
      throw new Error(`Failed to fetch transcripts: ${transcriptError.message}`);
    }

    if (!transcripts || transcripts.length === 0) {
      console.error('No transcripts found for project:', projectId);
      throw new Error('No transcript found - STT may have failed');
    }

    console.log(`Found ${transcripts.length} transcript(s)`);

    const transcript = transcripts[0];
    const transcriptContent = transcript.content;
    
    // Extract original text and duration
    const originalText = transcriptContent.text || '';
    const originalDuration = transcriptContent.duration || 0;
    
    console.log(`Original text: "${originalText.substring(0, 100)}..."`);
    console.log(`Original duration: ${originalDuration.toFixed(2)}s`);

    // Use validation loop to ensure translated audio matches original duration
    console.log('Starting duration validation loop...');
    const validationResult = await validator.adaptAndValidate(
      originalText,
      originalDuration,
      project.target_language,
      '/tmp'
    );

    console.log(`Validation complete after ${validationResult.attempts} attempts`);
    console.log(`Final duration: ${validationResult.duration.toFixed(2)}s (target: ${originalDuration.toFixed(2)}s)`);
    console.log(`Within tolerance: ${validationResult.isValid ? 'YES' : 'NO (using best attempt)'}`);

    // Build translation content with validated text
    const translationContent = {
      ...transcriptContent,
      text: validationResult.text,
      language: project.target_language,
      duration: validationResult.duration,
      validation: {
        attempts: validationResult.attempts,
        isValid: validationResult.isValid,
        targetDuration: originalDuration,
        actualDuration: validationResult.duration,
        difference: validationResult.duration - originalDuration
      }
    };

    // Save metrics (optional, based on schema)
    const { error: metricsError } = await supabase
      .from('adaptation_metrics')
      .insert({
        project_id: projectId,
        language_pair: `${project.source_language}-${project.target_language}`,
        total_segments: 1,
        successful_segments: validationResult.isValid ? 1 : 0,
        failed_segments: validationResult.isValid ? 0 : 1,
        success_rate: validationResult.isValid ? 100 : 0,
        average_attempts: validationResult.attempts,
        validation_failure_reasons: validationResult.isValid ? {} : { 
          reason: 'Duration tolerance not met',
          difference: validationResult.duration - originalDuration
        },
      });
    
    if (metricsError) {
      console.error('Failed to save metrics:', metricsError);
    }

    console.log('Saving translation to database...');
    const now = new Date().toISOString();
    const { data: savedTranslation, error: translationError } = await supabase
      .from('translations')
      .insert({
        project_id: projectId,
        target_language: project.target_language,
        content: translationContent,
        approved: false,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (translationError) {
      console.error('Failed to save translation:', translationError);
      throw new Error(`Translation save failed: ${translationError.message}`);
    }

    console.log('Translation saved successfully:', savedTranslation?.id);

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'MT');

    console.log('Translation completed, triggering TTS...');
    await addJob('tts', { projectId });

  } catch (error: any) {
    console.error('Translation Error:', error);
    await supabase
      .from('jobs')
      .update({ status: 'FAILED', error_message: error.message })
      .eq('project_id', projectId)
      .eq('stage', 'MT');
    throw error;
  }
}
