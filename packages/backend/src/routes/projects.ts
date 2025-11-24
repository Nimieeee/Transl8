import { Router, Request } from 'express';
import multer from 'multer';
import { asyncHandler, AppError } from '../middleware/error-handler';
import supabase from '../lib/supabase';
import { uploadToStorage } from '../lib/storage';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// No authentication required - open access

router.get('/', asyncHandler(async (req: Request, res: any) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Supabase error fetching projects:', error);
    throw new AppError(500, `Failed to fetch projects: ${error.message}`);
  }
  res.json(projects);
}));

router.post('/', asyncHandler(async (req: Request, res: any) => {
  const { name, sourceLanguage, targetLanguage } = req.body;
  
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: null, // No user authentication
      name,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      status: 'DRAFT'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Supabase error creating project:', error);
    throw new AppError(500, `Failed to create project: ${error.message}`);
  }
  res.json(project);
}));

router.get('/:id', asyncHandler(async (req: Request, res: any) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error || !project) throw new AppError(404, 'Project not found');
  res.json(project);
}));

router.get('/:id/jobs', asyncHandler(async (req: Request, res: any) => {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('project_id', req.params.id)
    .order('created_at', { ascending: true });
  
  if (error) throw new AppError(500, 'Failed to fetch jobs');
  res.json(jobs || []);
}));

router.post('/:id/upload', upload.single('video'), asyncHandler(async (req: Request, res: any) => {
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (fetchError || !project) throw new AppError(404, 'Project not found');
  if (!req.file) throw new AppError(400, 'No file uploaded');

  const videoUrl = await uploadToStorage(req.file.path, `projects/${project.id}/video`);
  
  // Update project with video URL and set to PROCESSING status
  const { error: updateError } = await supabase
    .from('projects')
    .update({ 
      video_url: videoUrl, 
      status: 'PROCESSING' 
    })
    .eq('id', project.id);
    
  if (updateError) throw new AppError(500, 'Failed to update project');

  // Automatically start dubbing process
  try {
    const { addJob } = await import('../lib/queue');
    await addJob('stt', { 
      projectId: project.id, 
      videoUrl,
      sourceLanguage: project.source_language,
      targetLanguage: project.target_language
    });
    console.log(`✅ Dubbing started automatically for project ${project.id}`);
  } catch (queueError: any) {
    console.error('Failed to start dubbing:', queueError);
    // Don't fail the upload if queue fails - just log it
  }

  res.json({ 
    videoUrl,
    status: 'PROCESSING',
    message: 'Upload successful, dubbing started'
  });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: any) => {
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (fetchError || !project) throw new AppError(404, 'Project not found');

  // Delete the project (cascade will delete related records)
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id);
    
  if (deleteError) throw new AppError(500, 'Failed to delete project');

  res.json({ message: 'Project deleted successfully' });
}));

export default router;
