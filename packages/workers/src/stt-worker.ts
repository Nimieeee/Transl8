import { Job } from 'bullmq';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processStt(job: Job) {
  const { projectId, videoUrl } = job.data;

  await prisma.job.create({
    data: { projectId, stage: 'STT', status: 'PROCESSING' }
  });

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

    await prisma.transcript.create({
      data: {
        projectId,
        content: transcription as any, // Cast to any to match Json type if needed, or structure it
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
    console.error('STT Error:', error);
    await prisma.job.updateMany({
      where: { projectId, stage: 'STT' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
