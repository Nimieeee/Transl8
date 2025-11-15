import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import prisma from '../lib/prisma';
import { addJob } from '../lib/queue';

const router = Router();

router.use(authenticate);

router.post('/start', asyncHandler(async (req: AuthRequest, res: any) => {
  const { projectId } = req.body;
  
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.userId }
  });
  
  if (!project) throw new AppError(404, 'Project not found');
  if (!project.videoUrl) throw new AppError(400, 'No video uploaded');

  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'PROCESSING' }
  });

  // Create jobs for pipeline
  await addJob('stt', { projectId, videoUrl: project.videoUrl });

  res.json({ message: 'Dubbing started', projectId });
}));

router.get('/status/:projectId', asyncHandler(async (req: AuthRequest, res: any) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.userId },
    include: { jobs: true }
  });
  
  if (!project) throw new AppError(404, 'Project not found');
  
  res.json({
    status: project.status,
    jobs: project.jobs
  });
}));

export default router;
