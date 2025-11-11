import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

// Track analytics event
router.post('/events', async (req, res) => {
  try {
    const { eventName, eventData, pageUrl, sessionId } = req.body;
    const userId = req.user?.userId || null;
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || null;

    if (!eventName) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    await prisma.analyticsEvent.create({
      data: {
        userId,
        sessionId,
        eventName,
        eventData: eventData || {},
        pageUrl,
        userAgent,
        ipAddress
      }
    });

    res.status(201).json({ message: 'Event tracked successfully' });
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get user analytics (admin only)
router.get('/users/:userId/events', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { eventName, limit = 100, offset = 0 } = req.query;

    const where: any = { userId };
    if (eventName) {
      where.eventName = eventName;
    }

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        eventName: true,
        eventData: true,
        pageUrl: true,
        createdAt: true
      }
    });

    res.json({ events });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get analytics statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, eventName } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (eventName) {
      where.eventName = eventName;
    }

    const [
      totalEvents,
      uniqueUsers,
      eventsByName,
      eventsByDay
    ] = await Promise.all([
      prisma.analyticsEvent.count({ where }),
      prisma.analyticsEvent.findMany({
        where: { ...where, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true }
      }).then(users => users.length),
      prisma.analyticsEvent.groupBy({
        by: ['eventName'],
        where,
        _count: true,
        orderBy: { _count: { eventName: 'desc' } },
        take: 20
      }),
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM analytics_events
        WHERE created_at >= ${startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `
    ]);

    res.json({
      totalEvents,
      uniqueUsers,
      eventsByName,
      eventsByDay
    });
  } catch (error) {
    logger.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics statistics' });
  }
});

// Get feature adoption metrics
router.get('/adoption', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Track key feature usage
    const featureEvents = [
      'project_created',
      'video_uploaded',
      'transcript_edited',
      'translation_edited',
      'voice_clone_created',
      'project_completed'
    ];

    const adoption = await Promise.all(
      featureEvents.map(async (eventName) => {
        const [totalEvents, uniqueUsers] = await Promise.all([
          prisma.analyticsEvent.count({
            where: { ...where, eventName }
          }),
          prisma.analyticsEvent.findMany({
            where: { ...where, eventName, userId: { not: null } },
            distinct: ['userId'],
            select: { userId: true }
          }).then(users => users.length)
        ]);

        return {
          feature: eventName,
          totalEvents,
          uniqueUsers
        };
      })
    );

    res.json({ adoption });
  } catch (error) {
    logger.error('Error fetching adoption metrics:', error);
    res.status(500).json({ error: 'Failed to fetch adoption metrics' });
  }
});

// Get user journey funnel
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Define funnel stages
    const stages = [
      { name: 'Registered', event: 'user_registered' },
      { name: 'Created Project', event: 'project_created' },
      { name: 'Uploaded Video', event: 'video_uploaded' },
      { name: 'Edited Transcript', event: 'transcript_edited' },
      { name: 'Completed Project', event: 'project_completed' }
    ];

    const funnel = await Promise.all(
      stages.map(async (stage) => {
        const uniqueUsers = await prisma.analyticsEvent.findMany({
          where: { ...where, eventName: stage.event, userId: { not: null } },
          distinct: ['userId'],
          select: { userId: true }
        }).then(users => users.length);

        return {
          stage: stage.name,
          users: uniqueUsers
        };
      })
    );

    res.json({ funnel });
  } catch (error) {
    logger.error('Error fetching funnel data:', error);
    res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
});

export default router;
