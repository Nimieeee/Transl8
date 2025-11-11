import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, generateTokens, verifyToken } from '../lib/auth';
import {
  storeRefreshToken,
  isRefreshTokenValid,
  invalidateRefreshToken,
  invalidateAllUserTokens,
} from '../lib/redis';
import { registerSchema, loginSchema, refreshTokenSchema, AuthResponse } from '../types/auth';
import { authenticateToken } from '../middleware/auth';
import { ZodError } from 'zod';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
          retryable: false,
        },
      });
      return;
    }

    // Hash password with bcrypt cost factor 12
    const passwordHash = await hashPassword(password);

    // Create user (MVP: simplified without subscription fields)
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
      },
    });

    // Generate tokens (MVP: simplified payload)
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in Redis (7 days)
    await storeRefreshToken(user.id, tokens.refreshToken, 7 * 24 * 60 * 60);

    // Return user data and tokens (MVP: simplified response)
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
      },
      tokens,
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          retryable: false,
        },
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          retryable: false,
        },
      });
      return;
    }

    // Verify password (MVP: using 'password' field from schema)
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          retryable: false,
        },
      });
      return;
    }

    // Generate tokens (MVP: simplified payload)
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in Redis (7 days)
    await storeRefreshToken(user.id, tokens.refreshToken, 7 * 24 * 60 * 60);

    // Return user data and tokens (MVP: simplified response)
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
      },
      tokens,
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          retryable: false,
        },
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (error) {
      res.status(403).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          retryable: false,
        },
      });
      return;
    }

    // Check if refresh token exists in Redis
    const isValid = await isRefreshTokenValid(payload.userId, refreshToken);

    if (!isValid) {
      res.status(403).json({
        error: {
          code: 'REFRESH_TOKEN_REVOKED',
          message: 'Refresh token has been revoked',
          retryable: false,
        },
      });
      return;
    }

    // Get updated user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          retryable: false,
        },
      });
      return;
    }

    // Generate new tokens (MVP: simplified payload)
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Invalidate old refresh token
    await invalidateRefreshToken(payload.userId, refreshToken);

    // Store new refresh token
    await storeRefreshToken(user.id, tokens.refreshToken, 7 * 24 * 60 * 60);

    res.status(200).json({ tokens });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          retryable: false,
        },
      });
      return;
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during token refresh',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    if (refreshToken) {
      // Invalidate specific refresh token
      await invalidateRefreshToken(req.user.userId, refreshToken);
    } else {
      // Invalidate all refresh tokens for user
      await invalidateAllUserTokens(req.user.userId);
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          retryable: false,
        },
      });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user data',
        retryable: true,
      },
    });
  }
});

export default router;
