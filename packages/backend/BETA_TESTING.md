# Beta Testing Infrastructure

This document describes the beta testing infrastructure for the AI Video Dubbing Platform.

## Overview

The beta testing system provides:
- Beta user onboarding with invite codes
- Feedback collection system
- Analytics tracking for user behavior
- Support ticket system

## Database Schema

### Beta User Fields
- `is_beta_tester`: Boolean flag indicating beta tester status
- `beta_onboarded_at`: Timestamp of beta activation
- `beta_invite_code`: Unique invite code used for activation

### Feedback Table
Stores user feedback including surveys, bug reports, and feature requests.

### AnalyticsEvent Table
Tracks user behavior and feature adoption metrics.

### SupportTicket & SupportTicketMessage Tables
Manages support tickets and conversations.

## API Endpoints

### Beta Onboarding

#### POST /api/beta/invite-codes
Generate a new beta invite code (admin only).

#### POST /api/beta/activate
Activate beta access with an invite code.

**Request:**
```json
{
  "inviteCode": "ABCD1234"
}
```

**Response:**
```json
{
  "message": "Beta access activated successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "isBetaTester": true,
    "subscriptionTier": "PRO",
    "processingMinutesLimit": -1
  }
}
```

#### GET /api/beta/onboarding-status
Get current user's beta onboarding status.

### Feedback Collection

#### POST /api/feedback
Submit feedback.

**Request:**
```json
{
  "type": "bug_report",
  "category": "UI/UX",
  "rating": 8,
  "content": "The transcript editor is confusing...",
  "metadata": {
    "page": "/projects/123/transcript",
    "browser": "Chrome"
  }
}
```

#### GET /api/feedback/my-feedback
Get user's feedback history.

#### GET /api/feedback/all
Get all feedback (admin only).

#### GET /api/feedback/stats
Get feedback statistics.

### Analytics Tracking

#### POST /api/analytics/events
Track an analytics event.

**Request:**
```json
{
  "eventName": "project_created",
  "eventData": {
    "projectId": "proj-123",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  },
  "pageUrl": "/dashboard",
  "sessionId": "session-123"
}
```

#### GET /api/analytics/stats
Get analytics statistics.

#### GET /api/analytics/adoption
Get feature adoption metrics.

#### GET /api/analytics/funnel
Get user journey funnel data.

### Support System

#### POST /api/support/tickets
Create a support ticket.

**Request:**
```json
{
  "subject": "Video processing stuck",
  "description": "My video has been processing for 2 hours...",
  "category": "technical",
  "priority": "high"
}
```

#### GET /api/support/tickets
Get user's support tickets.

#### GET /api/support/tickets/:id
Get specific ticket with messages.

#### POST /api/support/tickets/:id/messages
Add a message to a ticket.

## Frontend Components

### BetaOnboarding
Component for activating beta access with an invite code.

**Usage:**
```tsx
import { BetaOnboarding } from '@/components/beta/beta-onboarding';

<BetaOnboarding />
```

### FeedbackForm
Component for submitting feedback.

**Usage:**
```tsx
import { FeedbackForm } from '@/components/beta/feedback-form';

<FeedbackForm 
  type="bug_report"
  category="performance"
  onSuccess={() => console.log('Feedback submitted')}
/>
```

### SupportWidget
Floating support widget for creating tickets.

**Usage:**
```tsx
import { SupportWidget } from '@/components/beta/support-widget';

// Add to layout
<SupportWidget />
```

## Analytics Library

The analytics library provides methods for tracking user behavior.

**Usage:**
```tsx
import { analytics } from '@/lib/analytics';

// Track page view
analytics.pageView('/dashboard');

// Track project creation
analytics.projectCreated('proj-123', 'en', 'es');

// Track custom event
analytics.track({
  eventName: 'custom_event',
  eventData: { key: 'value' }
});
```

### Available Methods
- `pageView(path)`: Track page views
- `userRegistered()`: Track user registration
- `projectCreated(id, sourceLang, targetLang)`: Track project creation
- `videoUploaded(id, duration, size)`: Track video uploads
- `transcriptEdited(id)`: Track transcript edits
- `translationEdited(id)`: Track translation edits
- `voiceCloneCreated(id, language)`: Track voice clone creation
- `projectCompleted(id, time)`: Track project completion
- `featureUsed(name, metadata)`: Track feature usage
- `errorOccurred(type, message, context)`: Track errors

## Beta Testing Workflow

### 1. Generate Invite Codes
Admin generates invite codes for beta testers:
```bash
curl -X POST http://localhost:3001/api/beta/invite-codes \
  -H "Authorization: Bearer <admin-token>"
```

### 2. Distribute Codes
Send invite codes to selected beta testers via email.

### 3. Beta Activation
Users visit `/beta` page and enter their invite code to activate beta access.

### 4. Onboarding
After activation, users:
- Get upgraded to Pro tier
- Receive unlimited processing minutes
- Get 10 voice clone slots
- Access priority support

### 5. Feedback Collection
Users can submit feedback through:
- Feedback form at `/feedback`
- In-app feedback widgets
- Support tickets via floating widget

### 6. Analytics Tracking
All user actions are automatically tracked for analysis:
- Page views
- Feature usage
- Project lifecycle events
- Error occurrences

## Monitoring Beta Program

### Key Metrics to Track

1. **Activation Rate**: Invite codes used / codes distributed
2. **User Activation**: Users who created first project
3. **Feature Adoption**: Usage of key features
4. **Completion Rate**: Projects completed / projects started
5. **Feedback Volume**: Feedback submissions per user
6. **Support Tickets**: Ticket volume and resolution time

### Queries for Analysis

Get beta tester count:
```sql
SELECT COUNT(*) FROM users WHERE is_beta_tester = true;
```

Get feedback summary:
```sql
SELECT type, COUNT(*) as count, AVG(rating) as avg_rating
FROM feedback
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type;
```

Get feature adoption:
```sql
SELECT event_name, COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY unique_users DESC;
```

## Best Practices

1. **Regular Check-ins**: Schedule weekly surveys for active beta testers
2. **Quick Response**: Respond to support tickets within 24 hours
3. **Acknowledge Feedback**: Let users know their feedback is being reviewed
4. **Share Updates**: Keep beta testers informed about changes based on their feedback
5. **Incentivize Participation**: Recognize active contributors

## Migration

Run the beta testing migration:
```bash
cd packages/backend
npx prisma migrate dev --name beta_testing
```

## Security Considerations

1. **Invite Code Validation**: Codes are single-use and validated server-side
2. **Rate Limiting**: All endpoints are rate-limited
3. **Data Privacy**: Analytics data is anonymized where possible
4. **Access Control**: Admin endpoints require proper authentication
