import { Job } from 'bullmq';
import { Mistral } from '@mistralai/mistralai';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const MAX_RETRIES = 3;

export async function processTranslation(job: Job) {
  const { projectId } = job.data;

  await prisma.job.create({
    data: { projectId, stage: 'MT', status: 'PROCESSING' }
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { transcripts: true }
    });

    if (!project || !project.transcripts[0]) {
      throw new Error('No transcript found');
    }

    const transcript = project.transcripts[0];
    let attempts = 0;
    let translationContent: any = null;
    let lastError: any = null;

    while (attempts < MAX_RETRIES && !translationContent) {
      attempts++;
      try {
        console.log(`Translation attempt ${attempts} for project ${projectId}`);

        // Call translation API (using Mistral)
        const completion = await mistral.chat.complete({
          model: 'mistral-large-latest',
          messages: [{
            role: 'system',
            content: 'You are an expert translator and dubbing adapter. Your task is to translate the content and adapt it for dubbing, ensuring natural flow and matching the approximate duration of the original speech where possible. Return ONLY valid JSON.'
          }, {
            role: 'user',
            content: `Translate this from ${project.sourceLanguage} to ${project.targetLanguage}: ${JSON.stringify(transcript.content)}`
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
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!translationContent) {
      throw lastError || new Error('Failed to generate valid translation after retries');
    }

    // Save metrics (optional, based on schema)
    await prisma.adaptationMetrics.create({
      data: {
        projectId,
        languagePair: `${project.sourceLanguage}-${project.targetLanguage}`,
        totalSegments: 0, // TODO: Calculate from content
        successfulSegments: 0, // TODO: Calculate
        failedSegments: 0,
        successRate: 100,
        averageAttempts: attempts,
        validationFailureReasons: lastError ? { error: lastError.message } : {},
      }
    }).catch(err => console.error('Failed to save metrics:', err));

    await prisma.translation.create({
      data: {
        projectId,
        targetLanguage: project.targetLanguage,
        content: translationContent,
        approved: false
      }
    });

    await prisma.job.updateMany({
      where: { projectId, stage: 'MT' },
      data: { status: 'COMPLETED', progress: 100 }
    });

    await addJob('tts', { projectId });

  } catch (error: any) {
    console.error('Translation Error:', error);
    await prisma.job.updateMany({
      where: { projectId, stage: 'MT' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  }
}
