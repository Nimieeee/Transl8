import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { TokenPayload } from '../types/auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: {
        code: 'NO_TOKEN',
        message: 'Access token is required',
        retryable: false,
      },
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
        retryable: false,
      },
    });
  }
}

/**
 * Middleware to check if user has required subscription tier
 */
export function requireSubscriptionTier(...allowedTiers: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    const userTier = req.user.subscriptionTier;

    if (!allowedTiers.includes(userTier)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_TIER',
          message: `This feature requires ${allowedTiers.join(' or ')} subscription`,
          retryable: false,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - attaches user if token is valid but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch (error) {
      // Token invalid but we don't fail the request
    }
  }

  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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

  // Check if user has admin role (you can add an isAdmin field to User model)
  // For now, we'll check if email matches admin pattern
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');

  if (!adminEmails.includes(req.user.email)) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        retryable: false,
      },
    });
    return;
  }

  next();
}

/**
 * Middleware to check processing quota before job submission
 * Expects req.body.duration (in seconds) or req.body.durationMinutes
 */
export async function checkQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  // Get duration from request body (in seconds or minutes)
  const durationSeconds = req.body.duration || 0;
  const durationMinutes = req.body.durationMinutes || Math.ceil(durationSeconds / 60);

  if (durationMinutes <= 0) {
    res.status(400).json({
      error: {
        code: 'INVALID_DURATION',
        message: 'Valid duration is required',
        retryable: false,
      },
    });
    return;
  }

  try {
    const { checkProcessingQuota } = await import('../lib/subscription');
    const quotaCheck = await checkProcessingQuota(req.user.userId, durationMinutes);

    if (!quotaCheck.allowed) {
      res.status(403).json({
        error: {
          code: 'QUOTA_EXCEEDED',
          message: quotaCheck.reason || 'Processing quota exceeded',
          retryable: false,
          details: {
            remainingMinutes: quotaCheck.remainingMinutes,
            requiredMinutes: durationMinutes,
          },
        },
      });
      return;
    }

    // Attach quota info to request for later use
    req.body._quotaCheck = quotaCheck;
    next();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'QUOTA_CHECK_FAILED',
        message: 'Failed to check processing quota',
        retryable: true,
      },
    });
  }
}
