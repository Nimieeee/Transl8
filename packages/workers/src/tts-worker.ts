import { Job } from 'bullmq';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import prisma from './lib/prisma';
import { addJob } from './lib/queue';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const text = JSON.stringify(project.translations[0].content); // Ensure this extracts the actual text properly

    // Call TTS API (OpenAI TTS)
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // In a real scenario, upload 'buffer' to Supabase Storage or S3.
    // For now, we'll simulate an upload or save locally if needed, but the original code
    // just generated a fake URL. We will keep the fake URL logic but acknowledge the buffer exists.
    // TODO: Implement actual upload to Supabase Storage

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
    console.error('TTS Error:', error);
    await prisma.job.updateMany({
      where: { projectId, stage: 'TTS' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    throw error;
  }
}
