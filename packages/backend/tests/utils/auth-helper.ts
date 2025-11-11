import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

export function generateAuthToken(user: User): string {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });
}

export function generateRefreshToken(user: User): string {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });
}

export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
