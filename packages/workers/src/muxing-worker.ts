import { Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import supabase from './lib/supabase';
import { uploadToStorage } from './lib/storage';

export async function processMuxing(job: Job) {
  const { projectId, audioUrl } = job.data;

  await supabase
    .from('jobs')
    .insert({ project_id: projectId, stage: 'MUXING', status: 'PROCESSING' });

  const tempVideoPath = path.join('/tmp', `${projectId}_original.mp4`);
  const tempAudioPath = path.join('/tmp', `${projectId}_dubbed.mp3`);
  const outputPath = path.join('/tmp', `${projectId}_output.mp4`);

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project || !project.video_url || !project.audio_url) {
      throw new Error('Missing video or audio');
    }

    console.log('Downloading original video...');
    
    // Download original video
    const videoResponse = await axios.get(project.video_url, { responseType: 'stream' });
    const videoWriter = fs.createWriteStream(tempVideoPath);
    videoResponse.data.pipe(videoWriter);
    await new Promise<void>((resolve, reject) => {
      videoWriter.on('finish', () => resolve());
      videoWriter.on('error', reject);
    });

    console.log('Downloading dubbed audio...');
    
    // Download dubbed audio
    const audioResponse = await axios.get(project.audio_url, { responseType: 'stream' });
    const audioWriter = fs.createWriteStream(tempAudioPath);
    audioResponse.data.pipe(audioWriter);
    await new Promise<void>((resolve, reject) => {
      audioWriter.on('finish', () => resolve());
      audioWriter.on('error', reject);
    });

    console.log('Muxing video and audio...');

    // Combine video and audio using ffmpeg
    // Use video duration as reference, pad audio if needed
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions('-c:v copy') // Copy video stream without re-encoding
        .outputOptions('-c:a aac') // Encode audio as AAC
        .outputOptions('-map 0:v:0') // Use video from first input
        .outputOptions('-map 1:a:0') // Use audio from second input
        .outputOptions('-shortest:v 0') // Don't shorten video
        .outputOptions('-shortest:a 0') // Don't shorten audio
        .outputOptions('-fflags +shortest') // Use longest stream
        .outputOptions('-max_interleave_delta 0') // Better sync
        .save(outputPath)
        .on('end', () => {
          console.log('Muxing completed - video duration preserved');
          resolve(null);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        });
    });

    console.log('Uploading final video...');

    // Upload final video to storage
    const outputVideoUrl = await uploadToStorage(outputPath, `projects/${projectId}/output`);

    console.log('Final video uploaded:', outputVideoUrl);

    // Update project with final video URL and mark as completed
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
    console.error('Muxing Error:', error);
    
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
  } finally {
    // Cleanup temp files
    [tempVideoPath, tempAudioPath, outputPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
}
