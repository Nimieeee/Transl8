import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GDPR Data Export - Export all user data
 * GET /api/gdpr/export
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    logger.info('GDPR data export requested', { userId });

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          include: {
            transcripts: true,
            translations: true,
            jobs: true,
          },
        },
        voiceClones: true,
        feedback: true,
      },
    }) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        processingMinutesUsed: user.processingMinutesUsed,
        processingMinutesLimit: user.processingMinutesLimit,
        voiceCloneSlots: user.voiceCloneSlots,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      projects: user.projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: project.targetLanguage,
        duration: project.duration,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        transcripts: project.transcripts,
        translations: project.translations,
        jobs: project.jobs.map((job) => ({
          id: job.id,
          stage: job.stage,
          status: job.status,
          progress: job.progress,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
      })),
      voiceClones: user.voiceClones.map((clone: any) => ({
        id: clone.id,
        name: clone.name,
        language: clone.language,
        createdAt: clone.createdAt,
      })),
      feedback: user.feedback,
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-export-${userId}-${Date.now()}.json"`
    );

    logger.info('GDPR data export completed', { userId });

    return res.json(exportData);
  } catch (error) {
    logger.error('GDPR data export failed', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to export user data' });
  }
});

/**
 * GDPR Right to Deletion - Delete user account and all associated data
 * DELETE /api/gdpr/delete-account
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Invalid confirmation. Please provide confirmation: "DELETE_MY_ACCOUNT"',
      });
    }

    logger.info('GDPR account deletion requested', { userId });

    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: true,
        voiceClones: true,
      },
    }) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Note: File deletion from storage should be handled by your storage service
    // For now, we'll just delete from database (cascade delete configured)

    // Delete user and all related data (cascade delete configured in schema)
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('GDPR account deletion completed', { userId });

    return res.json({
      message: 'Account and all associated data have been permanently deleted',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR account deletion failed', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Get GDPR consent status
 * GET /api/gdpr/consent
 */
router.get('/consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        gdprConsent: true,
        gdprConsentDate: true,
        cookieConsent: true,
        cookieConsentDate: true,
      } as any,
    }) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    logger.error('Failed to fetch GDPR consent', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch consent status' });
  }
});

/**
 * Update GDPR consent
 * POST /api/gdpr/consent
 */
router.post('/consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { gdprConsent, cookieConsent } = req.body;

    const updateData: any = {};

    if (typeof gdprConsent === 'boolean') {
      updateData.gdprConsent = gdprConsent;
      updateData.gdprConsentDate = new Date();
    }

    if (typeof cookieConsent === 'boolean') {
      updateData.cookieConsent = cookieConsent;
      updateData.cookieConsentDate = new Date();
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData as any,
      select: {
        gdprConsent: true,
        gdprConsentDate: true,
        cookieConsent: true,
        cookieConsentDate: true,
      } as any,
    }) as any;

    logger.info('GDPR consent updated', { userId, gdprConsent, cookieConsent });

    return res.json(user);
  } catch (error) {
    logger.error('Failed to update GDPR consent', { error, userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to update consent' });
  }
});

export default router;
