import { Job } from 'bullmq';
import axios from 'axios';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

export async function processStt(job: Job) {
  const { projectId, videoUrl } = job.data;

  await prisma.job.create({
    data: { projectId, stage: 'STT', status: 'PROCESSING' }
  });

  try {
    // Call OpenAI Whisper API
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', {
      file: videoUrl,
      model: 'whisper-1'
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const transcript = response.data;

    await prisma.transcript.create({
      data: {
        projectId,
        content: transcript,
        approved: false
      }
    });

    await prisma.job.updateMany({
      where: { projectId, stage: 'STT' },
      data: { status: 'COMPLETED', progress: 100 }
    });

    // Trigger next stage
    await addJob('translation', { projectId });

  } catch (error: any) {
    await prisma.job.updateMany({
      where: { projectId, stage: 'STT' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  }
}
