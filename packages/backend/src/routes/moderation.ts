import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { contentModerationService } from '../lib/content-moderation';

const router = Router();

/**
 * Report content for abuse
 * POST /api/moderation/report
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { contentType, contentId, reason, description } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: contentType, contentId, reason',
      });
    }

    // Validate content type
    const validContentTypes = ['project', 'voice_clone', 'transcript', 'translation'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid content type',
      });
    }

    // Create abuse report
    const report = await prisma.abuseReport.create({
      data: {
        reporterId: userId,
        contentType,
        contentId,
        reason,
        description: description || '',
        status: 'pending',
      },
    });

    logger.info('Abuse report created', {
      reportId: report.id,
      userId,
      contentType,
      contentId,
      reason,
    });

    // Trigger automated content scan
    await contentModerationService.scanContent(contentType, contentId);

    return res.status(201).json({
      message: 'Report submitted successfully',
      reportId: report.id,
    });
  } catch (error) {
    logger.error('Failed to create abuse report', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * Get user's abuse reports
 * GET /api/moderation/my-reports
 */
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const reports = await prisma.abuseReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contentType: true,
        contentId: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        reviewNotes: true,
      },
    });

    return res.json({ reports });
  } catch (error) {
    logger.error('Failed to fetch abuse reports', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * Get all abuse reports (admin only)
 * GET /api/moderation/reports
 */
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, contentType, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (contentType) where.contentType = contentType;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      prisma.abuseReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.abuseReport.count({ where }),
    ]);

    return res.json({
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch abuse reports', { error });
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * Review abuse report (admin only)
 * PUT /api/moderation/reports/:id/review
 */
router.put('/reports/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!action || !['approve', 'reject', 'remove_content'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be: approve, reject, or remove_content',
      });
    }

    const report = await prisma.abuseReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report status
    const updatedReport = await prisma.abuseReport.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'removed',
        reviewedAt: new Date(),
        reviewedBy: req.user!.userId,
        reviewNotes: notes || '',
      },
    });

    // If content should be removed, take action
    if (action === 'remove_content') {
      await contentModerationService.removeContent(report.contentType, report.contentId);
      
      logger.warn('Content removed due to abuse report', {
        reportId: id,
        contentType: report.contentType,
        contentId: report.contentId,
        reviewedBy: req.user!.userId,
      });
    }

    logger.info('Abuse report reviewed', {
      reportId: id,
      action,
      reviewedBy: req.user!.userId,
    });

    return res.json({
      message: 'Report reviewed successfully',
      report: updatedReport,
    });
  } catch (error) {
    logger.error('Failed to review abuse report', { error, reportId: req.params.id });
    return res.status(500).json({ error: 'Failed to review report' });
  }
});

/**
 * Get content policy
 * GET /api/moderation/content-policy
 */
router.get('/content-policy', (req, res) => {
  const contentPolicy = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    title: 'Content Policy',
    prohibitedContent: [
      'Illegal content or content that promotes illegal activities',
      'Content that infringes on intellectual property rights',
      'Hate speech, harassment, or discriminatory content',
      'Violent or graphic content',
      'Sexual or pornographic content',
      'Content that promotes self-harm or suicide',
      'Spam, scams, or fraudulent content',
      'Malware or malicious code',
      'Content that violates privacy rights',
      'Deepfakes or misleading synthetic media without disclosure',
    ],
    voiceCloneRestrictions: [
      'You must have explicit permission to clone someone\'s voice',
      'You cannot clone voices of public figures without authorization',
      'Voice clones must not be used for impersonation or fraud',
      'Voice clones must not be used to create misleading content',
    ],
    consequences: [
      'First violation: Warning and content removal',
      'Second violation: Temporary account suspension',
      'Third violation: Permanent account termination',
      'Severe violations may result in immediate termination',
    ],
    reporting: 'If you encounter content that violates this policy, please report it using the report button.',
  };

  return res.json(contentPolicy);
});

export default router;
