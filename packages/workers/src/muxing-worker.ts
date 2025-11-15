import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import prisma from './lib/prisma';

export async function processMuxing(job: Job) {
  const { projectId } = job.data;

  await prisma.job.create({
    data: { projectId, stage: 'MUXING', status: 'PROCESSING' }
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || !project.videoUrl || !project.audioUrl) {
      throw new Error('Missing video or audio');
    }

    const outputPath = `/tmp/${projectId}-output.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(project.videoUrl!)
        .input(project.audioUrl!)
        .outputOptions('-c:v copy')
        .outputOptions('-c:a aac')
        .outputOptions('-map 0:v:0')
        .outputOptions('-map 1:a:0')
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    const outputVideoUrl = `https://storage.example.com/${projectId}/output.mp4`;

    await prisma.project.update({
      where: { id: projectId },
      data: { 
        outputVideoUrl,
        status: 'COMPLETED'
      }
    });

    await prisma.job.updateMany({
      where: { projectId, stage: 'MUXING' },
      data: { status: 'COMPLETED', progress: 100 }
    });

  } catch (error: any) {
    await prisma.job.updateMany({
      where: { projectId, stage: 'MUXING' },
      data: { status: 'FAILED', errorMessage: error.message }
    });
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'FAILED' }
    });
    
    throw error;
  }
}
