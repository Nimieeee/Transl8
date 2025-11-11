import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Get licensing terms
 * GET /api/licensing/terms
 */
router.get('/terms', (_req, res) => {
  const licensingTerms = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    title: 'Licensing and Copyright Terms',
    content: {
      introduction: `These terms govern the use of AI-generated content and voice clones created through our platform.`,
      
      contentOwnership: {
        title: 'Content Ownership',
        items: [
          'You retain full ownership of your original video content',
          'You retain ownership of transcripts and translations generated from your content',
          'AI-generated audio (TTS output) is licensed to you based on your subscription tier',
          'Voice clones created from your voice samples are owned by you',
        ],
      },
      
      voiceCloneLicensing: {
        title: 'Voice Clone Usage Rights',
        description: 'By creating a voice clone, you represent and warrant that:',
        items: [
          'You have the legal right to clone the voice (it is your own voice or you have explicit permission)',
          'You will not use voice clones to impersonate others without consent',
          'You will not use voice clones for fraudulent or deceptive purposes',
          'You will not clone voices of public figures without authorization',
          'You understand that unauthorized voice cloning may violate personality rights and privacy laws',
        ],
      },
      
      commercialUse: {
        title: 'Commercial Use Rights',
        free: {
          tier: 'Free Tier',
          rights: [
            'Personal, non-commercial use only',
            'Videos include watermark to prevent commercial use',
            'Cannot be used for revenue-generating content',
            'Cannot be redistributed or resold',
          ],
        },
        creator: {
          tier: 'Creator Tier',
          rights: [
            'Commercial use permitted for content creation',
            'No watermark on output videos',
            'Can be used for YouTube, social media, and online courses',
            'Cannot be redistributed as a service to others',
          ],
        },
        pro: {
          tier: 'Pro Tier',
          rights: [
            'Full commercial use rights',
            'No watermark on output videos',
            'Can be used for any commercial purpose',
            'Can be used for client work and agency services',
            'Includes commercial voice clone usage rights',
          ],
        },
        enterprise: {
          tier: 'Enterprise Tier',
          rights: [
            'Full commercial use rights with custom licensing',
            'White-label options available',
            'Custom terms negotiable',
            'Dedicated support for licensing questions',
          ],
        },
      },
      
      attribution: {
        title: 'Attribution Requirements',
        description: 'For AI-generated content, you must:',
        items: [
          'Disclose that content contains AI-generated audio when required by law',
          'Not misrepresent AI-generated content as human-created when disclosure is required',
          'Follow platform-specific disclosure requirements (YouTube, TikTok, etc.)',
          'Include appropriate disclaimers for synthetic media when required',
        ],
      },
      
      copyrightCompliance: {
        title: 'Copyright Compliance',
        items: [
          'You must own or have rights to all source content you upload',
          'You are responsible for obtaining necessary licenses for copyrighted material',
          'We do not claim ownership of your source content',
          'We reserve the right to remove content that infringes copyright',
          'Repeat copyright violations may result in account termination',
        ],
      },
      
      watermarkPolicy: {
        title: 'Watermark Policy',
        description: 'Free tier videos include a watermark to:',
        items: [
          'Prevent unauthorized commercial use',
          'Identify content created with our platform',
          'Encourage upgrading for commercial use',
          'Removing watermarks without upgrading violates our terms',
        ],
      },
      
      liabilityLimitations: {
        title: 'Liability Limitations',
        items: [
          'You are solely responsible for how you use AI-generated content',
          'We are not liable for copyright infringement by users',
          'We are not liable for misuse of voice cloning technology',
          'You indemnify us against claims arising from your use of the platform',
        ],
      },
      
      enforcement: {
        title: 'Enforcement',
        description: 'Violations of these licensing terms may result in:',
        items: [
          'Content removal',
          'Account suspension or termination',
          'Legal action for commercial misuse',
          'Reporting to relevant authorities for fraudulent use',
        ],
      },
    },
  };

  return res.json(licensingTerms);
});

/**
 * Accept licensing terms
 * POST /api/licensing/accept
 */
router.post('/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        licensingTermsAccepted: true,
        licensingTermsVersion: version,
        licensingTermsAcceptedAt: new Date(),
      } as any, // Type will be correct after prisma generate
    });

    logger.info('User accepted licensing terms', { userId, version });

    return res.json({ message: 'Licensing terms accepted' });
  } catch (error) {
    logger.error('Failed to accept licensing terms', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to accept terms' });
  }
});

/**
 * Get user's licensing acceptance status
 * GET /api/licensing/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        licensingTermsAccepted: true,
        licensingTermsVersion: true,
        licensingTermsAcceptedAt: true,
        subscriptionTier: true,
      } as any, // Type will be correct after prisma generate
    }) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine commercial use rights based on tier
    const commercialUseAllowed = ['CREATOR', 'PRO', 'ENTERPRISE'].includes(user.subscriptionTier);
    const watermarkRequired = user.subscriptionTier === 'FREE';

    return res.json({
      licensingTermsAccepted: user.licensingTermsAccepted,
      licensingTermsVersion: user.licensingTermsVersion,
      licensingTermsAcceptedAt: user.licensingTermsAcceptedAt,
      subscriptionTier: user.subscriptionTier,
      commercialUseAllowed,
      watermarkRequired,
    });
  } catch (error) {
    logger.error('Failed to fetch licensing status', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * Get voice clone consent form
 * GET /api/licensing/voice-clone-consent
 */
router.get('/voice-clone-consent', (_req, res) => {
  const consentForm = {
    title: 'Voice Clone Consent and Acknowledgment',
    content: {
      introduction: 'Before creating a voice clone, you must acknowledge and agree to the following:',
      
      legalRepresentation: {
        title: 'Legal Representation',
        text: 'I represent and warrant that:',
        items: [
          'I am the owner of the voice being cloned, OR',
          'I have obtained explicit written permission from the voice owner',
          'I have the legal right to create and use this voice clone',
          'I am not cloning the voice of a public figure without authorization',
        ],
      },
      
      usageRestrictions: {
        title: 'Usage Restrictions',
        text: 'I agree that I will NOT:',
        items: [
          'Use the voice clone to impersonate others without consent',
          'Use the voice clone for fraudulent, deceptive, or illegal purposes',
          'Use the voice clone to create misleading or harmful content',
          'Use the voice clone in ways that violate personality rights or privacy laws',
          'Share or sell the voice clone to third parties without permission',
        ],
      },
      
      liabilityAcknowledgment: {
        title: 'Liability Acknowledgment',
        text: 'I understand and acknowledge that:',
        items: [
          'I am solely responsible for how I use the voice clone',
          'The platform is not liable for my misuse of voice cloning technology',
          'Unauthorized voice cloning may result in legal consequences',
          'My account may be terminated for violating these terms',
        ],
      },
      
      consent: {
        title: 'Consent',
        text: 'By checking the box below, I confirm that I have read, understood, and agree to these terms.',
      },
    },
  };

  return res.json(consentForm);
});

/**
 * Accept voice clone consent
 * POST /api/licensing/voice-clone-consent
 */
router.post('/voice-clone-consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { voiceCloneId, consent } = req.body;

    if (!voiceCloneId || !consent) {
      return res.status(400).json({ error: 'Voice clone ID and consent are required' });
    }

    // Update voice clone with consent
    await prisma.voiceClone.update({
      where: { id: voiceCloneId, userId },
      data: {
        consentGiven: true,
        consentDate: new Date(),
      } as any, // Type will be correct after prisma generate
    });

    logger.info('Voice clone consent given', { userId, voiceCloneId });

    return res.json({ message: 'Consent recorded' });
  } catch (error) {
    logger.error('Failed to record voice clone consent', { error, userId: req.user?.userId });
    return res.status(500).json({ error: 'Failed to record consent' });
  }
});

export default router;
