import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();

// Generate beta invite code
router.post('/invite-codes', authenticateToken, async (_req, res) => {
  try {
    // Only admins can generate invite codes (add admin check in production)
    const inviteCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    res.json({ inviteCode });
  } catch (error) {
    logger.error('Error generating invite code:', error);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Validate and activate beta access
router.post('/activate', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user!.userId;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Check if user is already a beta tester
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBetaTester: true, betaInviteCode: true }
    });

    if (user?.isBetaTester) {
      return res.status(400).json({ error: 'User is already a beta tester' });
    }

    // Check if invite code is already used
    const existingUser = await prisma.user.findUnique({
      where: { betaInviteCode: inviteCode }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Invite code has already been used' });
    }

    // Activate beta access and upgrade to Pro tier
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBetaTester: true,
        betaInviteCode: inviteCode,
        betaOnboardedAt: new Date(),
        subscriptionTier: 'PRO',
        processingMinutesLimit: -1, // Unlimited for beta
        voiceCloneSlots: 10
      },
      select: {
        id: true,
        email: true,
        isBetaTester: true,
        subscriptionTier: true,
        processingMinutesLimit: true
      }
    });

    logger.info(`Beta access activated for user ${userId} with code ${inviteCode}`);

    res.json({
      message: 'Beta access activated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error activating beta access:', error);
    res.status(500).json({ error: 'Failed to activate beta access' });
  }
});

// Get beta onboarding status
router.get('/onboarding-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBetaTester: true,
        betaOnboardedAt: true,
        subscriptionTier: true
      }
    });

    if (!user?.isBetaTester) {
      return res.status(403).json({ error: 'User is not a beta tester' });
    }

    // Check onboarding completion (e.g., first project created)
    const projectCount = await prisma.project.count({
      where: { userId }
    });

    res.json({
      isBetaTester: true,
      onboardedAt: user.betaOnboardedAt,
      hasCreatedProject: projectCount > 0,
      subscriptionTier: user.subscriptionTier
    });
  } catch (error) {
    logger.error('Error fetching onboarding status:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding status' });
  }
});

export default router;
