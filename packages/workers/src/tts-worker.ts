import { Job } from 'bullmq';
import axios from 'axios';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

export async function processTts(job: Job) {
  const { projectId } = job.data;

  await prisma.job.create({
    data: { projectId, stage: 'TTS', status: 'PROCESSING' }
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { translations: true }
    });

    if (!project || !project.translations[0]) {
      throw new Error('No translation found');
    }

    // Call TTS API (OpenAI TTS)
    const response = await axios.post('https://api.openai.com/v1/audio/speech', {
      model: 'tts-1',
      voice: 'alloy',
      input: JSON.stringify(project.translations[0].content)
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      responseType: 'arraybuffer'
    });

    // Upload audio to storage
    const audioUrl = `https://storage.example.com/${projectId}/audio.mp3`;

    await prisma.project.update({
      where: { id: projectId },
      data: { audioUrl }
    });

    await prisma.job.updateMany({
      where: { projectId, stage: 'TTS' },
      data: { status: 'COMPLETED', progress: 100 }
    });

    await addJob('muxing', { projectId });

  } catch (error: any) {
    await prisma.job.updateMany({
      where: { projectId, stage: 'TTS' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  }
}
