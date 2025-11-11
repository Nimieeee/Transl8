import { Router } from 'express';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Get Privacy Policy
 * GET /api/legal/privacy-policy
 */
router.get('/privacy-policy', (req, res) => {
  const privacyPolicy = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    lastUpdated: '2025-01-01',
    content: {
      introduction: `This Privacy Policy describes how we collect, use, and protect your personal information when you use our AI Video Dubbing Platform.`,
      
      dataCollection: {
        title: 'Data We Collect',
        items: [
          'Account information (email, password)',
          'Video files and audio content you upload',
          'Transcripts, translations, and voice clones you create',
          'Usage data and analytics',
          'Payment information (processed by Stripe)',
          'Cookies and similar technologies',
        ],
      },
      
      dataUsage: {
        title: 'How We Use Your Data',
        items: [
          'To provide and improve our video dubbing services',
          'To process your videos through our AI pipeline',
          'To manage your account and subscription',
          'To communicate with you about service updates',
          'To analyze usage patterns and improve our platform',
          'To comply with legal obligations',
        ],
      },
      
      dataStorage: {
        title: 'Data Storage and Security',
        description: 'We store your data securely using industry-standard encryption. Video files are automatically deleted after 30 days. We use AWS/GCP infrastructure with encryption at rest and in transit.',
      },
      
      dataSharing: {
        title: 'Data Sharing',
        description: 'We do not sell your personal data. We may share data with service providers (cloud hosting, payment processing) who are contractually obligated to protect your information.',
      },
      
      userRights: {
        title: 'Your Rights (GDPR)',
        items: [
          'Right to access your personal data',
          'Right to rectification of inaccurate data',
          'Right to erasure (right to be forgotten)',
          'Right to data portability',
          'Right to restrict processing',
          'Right to object to processing',
          'Right to withdraw consent',
        ],
      },
      
      dataRetention: {
        title: 'Data Retention',
        description: 'We retain your account data for as long as your account is active. Video files are automatically deleted after 30 days. You can request deletion of your account and all associated data at any time.',
      },
      
      cookies: {
        title: 'Cookies',
        description: 'We use essential cookies for authentication and session management. We also use analytics cookies to understand how you use our platform. You can manage cookie preferences in your account settings.',
      },
      
      contact: {
        title: 'Contact Us',
        description: 'For privacy-related questions or to exercise your rights, contact us at privacy@example.com',
      },
    },
  };

  return res.json(privacyPolicy);
});

/**
 * Get Terms of Service
 * GET /api/legal/terms-of-service
 */
router.get('/terms-of-service', (req, res) => {
  const termsOfService = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    lastUpdated: '2025-01-01',
    content: {
      introduction: `By using our AI Video Dubbing Platform, you agree to these Terms of Service.`,
      
      serviceDescription: {
        title: 'Service Description',
        description: 'We provide an AI-powered video dubbing platform that translates and dubs videos into multiple languages using speech-to-text, machine translation, and text-to-speech technologies.',
      },
      
      userResponsibilities: {
        title: 'User Responsibilities',
        items: [
          'You must be at least 18 years old to use this service',
          'You are responsible for maintaining the security of your account',
          'You must not upload content that violates copyright or other intellectual property rights',
          'You must not upload illegal, harmful, or offensive content',
          'You must not use the service for fraudulent or malicious purposes',
          'You must comply with all applicable laws and regulations',
        ],
      },
      
      contentOwnership: {
        title: 'Content Ownership and Licensing',
        description: 'You retain ownership of your original content. By uploading content, you grant us a license to process it through our AI pipeline. AI-generated outputs (translations, dubbed audio) are provided to you under a license that depends on your subscription tier.',
      },
      
      subscriptionTerms: {
        title: 'Subscription and Payment',
        items: [
          'Subscriptions are billed monthly or annually',
          'Processing time limits apply based on your tier',
          'Free tier videos include a watermark',
          'Refunds are provided according to our refund policy',
          'We reserve the right to change pricing with 30 days notice',
        ],
      },
      
      serviceAvailability: {
        title: 'Service Availability',
        description: 'We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance that temporarily affects availability.',
      },
      
      termination: {
        title: 'Account Termination',
        description: 'We may suspend or terminate accounts that violate these terms. You may delete your account at any time through your account settings.',
      },
      
      disclaimers: {
        title: 'Disclaimers',
        items: [
          'AI-generated content may contain errors or inaccuracies',
          'We are not responsible for how you use AI-generated content',
          'Service is provided "as is" without warranties',
          'We are not liable for indirect or consequential damages',
        ],
      },
      
      changes: {
        title: 'Changes to Terms',
        description: 'We may update these terms from time to time. Continued use of the service constitutes acceptance of updated terms.',
      },
      
      contact: {
        title: 'Contact',
        description: 'For questions about these terms, contact us at legal@example.com',
      },
    },
  };

  return res.json(termsOfService);
});

/**
 * Get Data Processing Agreement (DPA) for EU users
 * GET /api/legal/dpa
 */
router.get('/dpa', (req, res) => {
  const dpa = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    title: 'Data Processing Agreement',
    content: {
      introduction: `This Data Processing Agreement ("DPA") forms part of the Terms of Service between you ("Data Controller") and us ("Data Processor") for the processing of personal data in accordance with GDPR.`,
      
      definitions: {
        title: 'Definitions',
        items: {
          personalData: 'Any information relating to an identified or identifiable natural person',
          processing: 'Any operation performed on personal data, including collection, storage, use, and deletion',
          dataSubject: 'The individual whose personal data is being processed',
        },
      },
      
      scopeAndPurpose: {
        title: 'Scope and Purpose of Processing',
        description: 'We process personal data solely for the purpose of providing video dubbing services as described in our Terms of Service. Processing includes storing video files, generating transcripts and translations, and creating voice clones.',
      },
      
      dataProcessorObligations: {
        title: 'Data Processor Obligations',
        items: [
          'Process personal data only on documented instructions from the Data Controller',
          'Ensure confidentiality of persons authorized to process personal data',
          'Implement appropriate technical and organizational security measures',
          'Assist the Data Controller in responding to data subject requests',
          'Delete or return personal data upon termination of services',
          'Make available all information necessary to demonstrate compliance',
        ],
      },
      
      subProcessors: {
        title: 'Sub-Processors',
        description: 'We may engage sub-processors (cloud hosting providers, payment processors) to assist in providing services. We maintain a list of sub-processors and notify you of any changes.',
        list: [
          'AWS/GCP - Cloud infrastructure and storage',
          'Stripe - Payment processing',
          'Sentry - Error tracking',
          'DataDog - Application monitoring',
        ],
      },
      
      dataSubjectRights: {
        title: 'Data Subject Rights',
        description: 'We assist you in fulfilling data subject rights requests, including access, rectification, erasure, restriction, portability, and objection.',
      },
      
      securityMeasures: {
        title: 'Security Measures',
        items: [
          'Encryption at rest and in transit (TLS 1.3)',
          'Access controls and authentication',
          'Regular security audits and penetration testing',
          'Incident response procedures',
          'Employee training on data protection',
        ],
      },
      
      dataBreachNotification: {
        title: 'Data Breach Notification',
        description: 'We will notify you without undue delay upon becoming aware of a personal data breach, and no later than 72 hours after discovery.',
      },
      
      internationalTransfers: {
        title: 'International Data Transfers',
        description: 'Data may be transferred outside the EU/EEA. We ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.',
      },
      
      auditRights: {
        title: 'Audit Rights',
        description: 'You have the right to audit our compliance with this DPA. We provide annual SOC 2 reports and respond to reasonable audit requests.',
      },
      
      termination: {
        title: 'Termination',
        description: 'Upon termination, we will delete or return all personal data within 30 days, unless required by law to retain it.',
      },
    },
  };

  return res.json(dpa);
});

/**
 * Get Cookie Policy
 * GET /api/legal/cookie-policy
 */
router.get('/cookie-policy', (req, res) => {
  const cookiePolicy = {
    version: '1.0',
    effectiveDate: '2025-01-01',
    content: {
      introduction: `This Cookie Policy explains how we use cookies and similar technologies on our platform.`,
      
      whatAreCookies: {
        title: 'What Are Cookies',
        description: 'Cookies are small text files stored on your device that help us provide and improve our services.',
      },
      
      cookieTypes: {
        title: 'Types of Cookies We Use',
        essential: {
          title: 'Essential Cookies',
          description: 'Required for authentication and basic functionality. Cannot be disabled.',
          examples: ['Session tokens', 'Authentication cookies', 'Security cookies'],
        },
        functional: {
          title: 'Functional Cookies',
          description: 'Remember your preferences and settings.',
          examples: ['Language preferences', 'UI preferences', 'Volume settings'],
        },
        analytics: {
          title: 'Analytics Cookies',
          description: 'Help us understand how you use our platform.',
          examples: ['Page views', 'Feature usage', 'Error tracking'],
        },
      },
      
      managingCookies: {
        title: 'Managing Cookies',
        description: 'You can manage cookie preferences in your account settings or browser settings. Disabling essential cookies may affect functionality.',
      },
      
      thirdPartyCookies: {
        title: 'Third-Party Cookies',
        description: 'We use third-party services that may set their own cookies (Stripe for payments, analytics providers).',
      },
    },
  };

  return res.json(cookiePolicy);
});

export default router;
