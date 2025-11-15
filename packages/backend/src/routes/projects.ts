import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import prisma from '../lib/prisma';
import { uploadToStorage } from '../lib/storage';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.use(authenticate);

router.get('/', asyncHandler(async (req: AuthRequest, res: any) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(projects);
}));

router.post('/', asyncHandler(async (req: AuthRequest, res: any) => {
  const { name, sourceLanguage, targetLanguage } = req.body;
  
  const project = await prisma.project.create({
    data: {
      userId: req.userId!,
      name,
      sourceLanguage,
      targetLanguage,
      status: 'DRAFT'
    }
  });
  
  res.json(project);
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res: any) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId }
  });
  
  if (!project) throw new AppError(404, 'Project not found');
  res.json(project);
}));

router.post('/:id/upload', upload.single('video'), asyncHandler(async (req: AuthRequest, res: any) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId }
  });
  
  if (!project) throw new AppError(404, 'Project not found');
  if (!req.file) throw new AppError(400, 'No file uploaded');

  const videoUrl = await uploadToStorage(req.file.path, `projects/${project.id}/video`);
  
  await prisma.project.update({
    where: { id: project.id },
    data: { videoUrl, status: 'UPLOADING' }
  });

  res.json({ videoUrl });
}));

export default router;
