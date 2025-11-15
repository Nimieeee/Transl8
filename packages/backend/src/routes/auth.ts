import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';

const router = Router();

router.post('/register', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError(400, 'Email and password required');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(400, 'User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword }
  });

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
}));

router.post('/login', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
}));

export default router;
