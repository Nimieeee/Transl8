# Compliance and Legal Implementation

This document describes the compliance and legal features implemented in the AI Video Dubbing Platform.

## Overview

The platform implements comprehensive compliance and legal safeguards to ensure GDPR compliance, content moderation, and proper licensing of AI-generated content.

## GDPR Compliance

### Data Export (Right to Access)

**Endpoint:** `GET /api/gdpr/export`

Users can export all their personal data in JSON format, including:
- User account information
- Projects and associated data
- Transcripts and translations
- Voice clones
- Feedback and support tickets
- Subscription history

**Usage:**
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/api/gdpr/export \
  -o user-data-export.json
```

### Right to Deletion

**Endpoint:** `DELETE /api/gdpr/delete-account`

Users can permanently delete their account and all associated data:
- Deletes all projects and files from storage
- Deletes all voice clones and audio samples
- Deletes all user data from database
- Cascade deletes all related records

**Usage:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE_MY_ACCOUNT"}' \
  https://api.example.com/api/gdpr/delete-account
```

### Consent Management

**Endpoints:**
- `GET /api/gdpr/consent` - Get consent status
- `POST /api/gdpr/consent` - Update consent preferences

Users can manage:
- GDPR consent (data processing agreement)
- Cookie consent (analytics and functional cookies)

### Legal Documents

**Endpoints:**
- `GET /api/legal/privacy-policy` - Privacy policy
- `GET /api/legal/terms-of-service` - Terms of service
- `GET /api/legal/cookie-policy` - Cookie policy
- `GET /api/legal/dpa` - Data Processing Agreement (for EU users)

All legal documents are versioned and include effective dates.

### Frontend Components

**Cookie Consent Banner:**
- Displays on first visit
- Allows accept/decline
- Stores preference locally and in database

**GDPR Settings Section:**
- Data export button
- Account deletion with confirmation
- Links to legal documents

## Content Moderation

### Abuse Reporting

**Endpoint:** `POST /api/moderation/report`

Users can report content for:
- Copyright infringement
- Hate speech
- Violence
- Spam
- Other violations

**Report Types:**
- Project content
- Voice clones
- Transcripts
- Translations

### Automated Content Scanning

The platform automatically scans content for prohibited material:
- Keyword-based filtering (basic implementation)
- Flags content for manual review
- Can be extended with ML-based moderation

**Prohibited Content:**
- Illegal content
- Hate speech and harassment
- Violent or graphic content
- Sexual content
- Content promoting self-harm
- Spam and fraud
- Malware
- Privacy violations
- Misleading deepfakes

### Manual Review Queue

**Admin Endpoints:**
- `GET /api/moderation/reports` - List all reports
- `PUT /api/moderation/reports/:id/review` - Review report

**Actions:**
- Approve (no violation)
- Reject (false report)
- Remove content (violation confirmed)

### Content Policy

**Endpoint:** `GET /api/moderation/content-policy`

Returns the platform's content policy including:
- Prohibited content types
- Voice clone restrictions
- Consequences for violations
- Reporting instructions

## Copyright and Licensing

### Licensing Terms

**Endpoint:** `GET /api/licensing/terms`

Comprehensive licensing terms covering:
- Content ownership
- Voice clone usage rights
- Commercial use rights by tier
- Attribution requirements
- Copyright compliance
- Watermark policy
- Liability limitations

### Subscription Tier Rights

**Free Tier:**
- Personal, non-commercial use only
- Watermark required
- Cannot be used for revenue-generating content

**Creator Tier:**
- Commercial use for content creation
- No watermark
- YouTube, social media, online courses
- Cannot redistribute as service

**Pro Tier:**
- Full commercial use rights
- No watermark
- Client work and agency services
- Commercial voice clone usage

**Enterprise Tier:**
- Custom licensing terms
- White-label options
- Negotiable terms

### Voice Clone Consent

**Endpoint:** `GET /api/licensing/voice-clone-consent`

Before creating voice clones, users must consent to:
- Legal representation (own voice or have permission)
- Usage restrictions (no impersonation, fraud)
- Liability acknowledgment

**Consent Recording:**
- `POST /api/licensing/voice-clone-consent`
- Records consent with timestamp
- Stored with voice clone record

### Watermarking

Watermarks are automatically applied to free-tier videos:
- Prevents commercial use
- Identifies platform-generated content
- Removed for paid tiers

**Implementation:**
```typescript
// In video-processor.ts
if (applyWatermark) {
  video = video.drawtext(
    text: 'Preview',
    fontsize: 24,
    fontcolor: 'white@0.5',
    x: '(w-text_w)/2',
    y: 'h-th-10'
  );
}
```

## Database Schema

### GDPR Fields (User model)
```prisma
model User {
  gdprConsent             Boolean
  gdprConsentDate         DateTime?
  cookieConsent           Boolean
  cookieConsentDate       DateTime?
  licensingTermsAccepted  Boolean
  licensingTermsVersion   String?
  licensingTermsAcceptedAt DateTime?
}
```

### Moderation Tables
```prisma
model AbuseReport {
  id              String
  reporterId      String
  contentType     String
  contentId       String
  reason          String
  description     String
  status          String
  reviewedAt      DateTime?
  reviewedBy      String?
  reviewNotes     String?
}

model ContentFlag {
  id              String
  contentType     String
  contentId       String
  reason          String
  status          String
  reviewedAt      DateTime?
}
```

### Voice Clone Consent
```prisma
model VoiceClone {
  consentGiven    Boolean
  consentDate     DateTime?
}
```

## Admin Configuration

### Admin Access

Set admin emails in environment variables:
```bash
ADMIN_EMAILS=admin@example.com,moderator@example.com
```

Admins can:
- Review abuse reports
- Remove flagged content
- Access moderation dashboard

## Frontend Integration

### Cookie Consent Banner
```tsx
import { CookieConsentBanner } from '@/components/legal/cookie-consent-banner';

// In layout.tsx
<CookieConsentBanner />
```

### GDPR Settings
```tsx
import { GDPRSection } from '@/components/settings/gdpr-section';

// In settings page
<GDPRSection />
```

### Voice Clone Consent
```tsx
import { VoiceCloneConsentModal } from '@/components/legal/voice-clone-consent-modal';

// Before creating voice clone
<VoiceCloneConsentModal
  isOpen={showConsent}
  onClose={() => setShowConsent(false)}
  onAccept={handleCreateVoiceClone}
/>
```

## Compliance Checklist

### GDPR Compliance ✓
- [x] Data export functionality
- [x] Right to deletion
- [x] Consent management
- [x] Privacy policy
- [x] Cookie policy
- [x] Data Processing Agreement
- [x] Subscription history tracking

### Content Moderation ✓
- [x] Abuse reporting system
- [x] Automated content scanning
- [x] Manual review queue
- [x] Content policy
- [x] Terms of service

### Copyright & Licensing ✓
- [x] Licensing terms by tier
- [x] Voice clone consent
- [x] Watermarking for free tier
- [x] Commercial use restrictions
- [x] Attribution requirements

## Future Enhancements

### Advanced Content Moderation
- Integrate ML-based content moderation (AWS Rekognition, Google Cloud Vision)
- Audio content analysis for prohibited speech
- Image/video analysis for inappropriate content
- Real-time moderation during upload

### Enhanced GDPR Features
- Automated data retention policies
- Data portability in multiple formats
- Consent management UI improvements
- Privacy dashboard with data usage insights

### Licensing Improvements
- Digital rights management (DRM)
- Usage tracking and analytics
- License verification API
- Blockchain-based licensing (optional)

## Support and Contact

For compliance-related questions:
- Privacy: privacy@example.com
- Legal: legal@example.com
- Abuse reports: abuse@example.com

## References

- GDPR: https://gdpr.eu/
- CCPA: https://oag.ca.gov/privacy/ccpa
- Content moderation best practices
- Voice cloning ethics guidelines
