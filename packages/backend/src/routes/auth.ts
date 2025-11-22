import { Router } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../lib/supabase';
import { generateToken } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';

const router = Router();

router.post('/register', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError(400, 'Email and password required');
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (existing) throw new AppError(400, 'User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password: hashedPassword })
    .select()
    .single();

  if (error) throw new AppError(500, 'Failed to create user');

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
}));

router.post('/login', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (error || !user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
}));

export default router;
