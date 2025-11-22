import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import supabase from './lib/supabase';

export async function processMuxing(job: Job) {
  const { projectId } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'MUXING', status: 'PROCESSING' });

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project || !project.video_url || !project.audio_url) {
      throw new Error('Missing video or audio');
    }

    const outputPath = `/tmp/${projectId}-output.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(project.video_url!)
        .input(project.audio_url!)
        .outputOptions('-c:v copy')
        .outputOptions('-c:a aac')
        .outputOptions('-map 0:v:0')
        .outputOptions('-map 1:a:0')
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    const outputVideoUrl = `https://storage.example.com/${projectId}/output.mp4`;

    await supabase
      .from('projects')
      .update({ 
        output_video_url: outputVideoUrl,
        status: 'COMPLETED'
      })
      .eq('id', projectId);

    await supabase
      .from('jobs')
      .update({ status: 'COMPLETED', progress: 100 })
      .eq('project_id', projectId)
      .eq('stage', 'MUXING');

  } catch (error: any) {
    await supabase
      .from('jobs')
      .update({ status: 'FAILED', error_message: error.message })
      .eq('project_id', projectId)
      .eq('stage', 'MUXING');
    
    await supabase
      .from('projects')
      .update({ status: 'FAILED' })
      .eq('id', projectId);
    
    throw error;
  }
}
