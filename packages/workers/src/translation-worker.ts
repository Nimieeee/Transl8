import { Job } from 'bullmq';
import axios from 'axios';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

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

    // Call translation API (using OpenAI for simplicity)
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Translate this from ${project.sourceLanguage} to ${project.targetLanguage}: ${JSON.stringify(transcript.content)}`
      }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const translation = response.data.choices[0].message.content;

    await prisma.translation.create({
      data: {
        projectId,
        targetLanguage: project.targetLanguage,
        content: JSON.parse(translation),
        approved: false
      }
    });

    await prisma.job.updateMany({
      where: { projectId, stage: 'MT' },
      data: { status: 'COMPLETED', progress: 100 }
    });

    await addJob('tts', { projectId });

  } catch (error: any) {
    await prisma.job.updateMany({
      where: { projectId, stage: 'MT' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  }
}
