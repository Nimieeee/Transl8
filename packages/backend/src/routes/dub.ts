import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import supabase from '../lib/supabase';
import { addJob } from '../lib/queue';

const router = Router();

router.use(authenticate);

router.post('/start', asyncHandler(async (req: AuthRequest, res: any) => {
  const { projectId } = req.body;
  
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', req.userId)
    .single();
  
  if (fetchError || !project) throw new AppError(404, 'Project not found');
  if (!project.video_url) throw new AppError(400, 'No video uploaded');

  const { error: updateError } = await supabase
    .from('projects')
    .update({ status: 'PROCESSING' })
    .eq('id', projectId);
    
  if (updateError) throw new AppError(500, 'Failed to update project');

  // Create jobs for pipeline
  await addJob('stt', { projectId, videoUrl: project.video_url });

  res.json({ message: 'Dubbing started', projectId });
}));

router.get('/status/:projectId', asyncHandler(async (req: AuthRequest, res: any) => {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.projectId)
    .eq('user_id', req.userId)
    .single();
  
  if (projectError || !project) throw new AppError(404, 'Project not found');
  
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .eq('project_id', req.params.projectId);
  
  res.json({
    status: project.status,
    jobs: jobs || []
  });
}));

export default router;
