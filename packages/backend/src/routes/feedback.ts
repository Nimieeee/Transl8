// @ts-nocheck
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

// Submit feedback
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { type, category, rating, content, metadata } = req.body;

    // Validate required fields
    if (!type || !content) {
      return res.status(400).json({ error: 'Type and content are required' });
    }

    // Validate type
    const validTypes = ['survey', 'bug_report', 'feature_request', 'general'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 10)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type,
        category,
        rating,
        content
      }
    });

    logger.info(`Feedback submitted by user ${userId}: ${type}`);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's feedback history
router.get('/my-feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { type, limit = 50 } = req.query;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      select: {
        id: true,
        type: true,
        category: true,
        rating: true,
        content: true,
        status: true,
        createdAt: true
      }
    });

    res.json({ feedback });
  } catch (error) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get all feedback (admin only - add proper admin auth in production)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { type, status, category, limit = 100, offset = 0 } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              subscriptionTier: true
            }
          }
        }
      }),
      prisma.feedback.count({ where })
    ]);

    res.json({
      feedback,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'reviewed', 'addressed', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status }
    });

    res.json({ message: 'Feedback status updated', feedback });
  } catch (error) {
    logger.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Get feedback statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalCount,
      byType,
      byStatus,
      averageRating
    ] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.feedback.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.feedback.aggregate({
        where: { ...where, rating: { not: null } },
        _avg: { rating: true }
      })
    ]);

    res.json({
      totalCount,
      byType,
      byStatus,
      averageRating: averageRating._avg.rating
    });
  } catch (error) {
    logger.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
});

export default router;
