import { Job } from 'bullmq';
import { Mistral } from '@mistralai/mistralai';
import supabase from './lib/supabase';
import { addJob } from './lib/queue';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const MAX_RETRIES = 3;

export async function processTranslation(job: Job) {
  const { projectId } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'MT', status: 'PROCESSING' });

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('project_id', projectId);

    if (!project || !transcripts || transcripts.length === 0) {
      throw new Error('No transcript found');
    }

    const transcript = transcripts[0];
    let attempts = 0;
    let translationContent: any = null;
    let lastError: any = null;

    while (attempts < MAX_RETRIES && !translationContent) {
      attempts++;
      try {
        console.log(`Translation attempt ${attempts} for project ${projectId}`);

        // Add delay to respect rate limits (1 req/sec for free tier)
        if (attempts > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Call translation API (using Mistral)
        const completion = await mistral.chat.complete({
          model: 'mistral-small-latest',
          messages: [{
            role: 'system',
            content: 'You are an expert translator and dubbing adapter. Your task is to translate the content and adapt it for dubbing, ensuring natural flow and matching the approximate duration of the original speech where possible. Return ONLY valid JSON.'
          }, {
            role: 'user',
            content: `Translate this from ${project.source_language} to ${project.target_language}: ${JSON.stringify(transcript.content)}`
          }],
          responseFormat: { type: 'json_object' }
        });

        const translation = completion.choices?.[0]?.message?.content;

        if (!translation) {
          throw new Error('No translation content returned');
        }

        const rawContent = typeof translation === 'string' ? translation : JSON.stringify(translation);

        // Validate JSON
        try {
          translationContent = JSON.parse(rawContent);
        } catch (e) {
          throw new Error('Invalid JSON returned from translation API');
        }

        // Basic structure validation (optional, depending on TranscriptContent type)
        if (!translationContent || typeof translationContent !== 'object') {
          throw new Error('Translation content is not a valid object');
          translationContent = null; // Reset to trigger retry
        }

      } catch (error: any) {
        console.error(`Attempt ${attempts} failed:`, error);
        lastError = error;
        
        // Handle rate limiting - wait longer between retries
        // Mistral free tier: 1 request per second
        const isRateLimitError = error.message?.includes('rate limit') || error.status === 429;
        const waitTime = isRateLimitError ? 2000 : (1000 * attempts);
        
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (!translationContent) {
      throw lastError || new Error('Failed to generate valid translation after retries');
    }

    // Save metrics (optional, based on schema)
    const { error: metricsError } = await supabase
      .from('adaptation_metrics')
      .insert({
        project_id: projectId,
        language_pair: `${project.source_language}-${project.target_language}`,
        total_segments: 0,
        successful_segments: 0,
        failed_segments: 0,
        success_rate: 100,
        average_attempts: attempts,
        validation_failure_reasons: lastError ? { error: lastError.message } : {},
      });
    
    if (metricsError) {
      console.error('Failed to save metrics:', metricsError);
    }

    await supabase
      .from('translations')
      .insert({
        project_id: projectId,
        target_language: project.target_language,
        content: translationContent,
        approved: false
      });

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'MT');

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
