# Beta Testing Quick Start Guide

This guide will help you set up and manage the beta testing program.

## Setup

### 1. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name beta_testing
```

This creates the necessary tables for beta testing:
- Adds beta fields to User table
- Creates Feedback table
- Creates AnalyticsEvent table
- Creates SupportTicket and SupportTicketMessage tables

### 2. Verify Routes

The beta testing routes are automatically registered in `src/index.ts`:
- `/api/beta/*` - Beta onboarding endpoints
- `/api/feedback/*` - Feedback collection endpoints
- `/api/analytics/*` - Analytics tracking endpoints
- `/api/support/*` - Support ticket endpoints

### 3. Start the Server

```bash
npm run dev
```

## Managing Beta Testers

### Generate Invite Codes

Generate 10 invite codes:
```bash
npm run manage-beta generate 10
```

Generate 50 invite codes:
```bash
npm run manage-beta generate 50
```

### List All Beta Testers

```bash
npm run manage-beta list
```

This shows:
- Email and user ID
- Invite code used
- Onboarding date
- Number of projects created
- Feedback submissions
- Support tickets

### View Beta Program Statistics

```bash
npm run manage-beta stats
```

This displays:
- Total beta testers
- Active testers (who created projects)
- Activation rate
- Projects per user
- Feedback and support metrics
- Average satisfaction rating

### Revoke Beta Access

```bash
npm run manage-beta revoke user@example.com
```

This will:
- Remove beta tester flag
- Downgrade to FREE tier
- Reset processing limits

## Testing the Flow

### 1. Generate an Invite Code

```bash
npm run manage-beta generate 1
```

Copy the generated code (e.g., `A1B2C3D4E5F6G7H8`).

### 2. Test Beta Activation

Using curl:
```bash
curl -X POST http://localhost:3001/api/beta/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"inviteCode": "A1B2C3D4E5F6G7H8"}'
```

Or visit the frontend at `http://localhost:3000/beta` and enter the code.

### 3. Submit Test Feedback

```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "general",
    "content": "This is test feedback",
    "rating": 8
  }'
```

### 4. Track Analytics Event

```bash
curl -X POST http://localhost:3001/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "test_event",
    "eventData": {"test": true},
    "sessionId": "test-session"
  }'
```

### 5. Create Support Ticket

```bash
curl -X POST http://localhost:3001/api/support/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "Test ticket",
    "description": "This is a test support ticket",
    "category": "technical",
    "priority": "medium"
  }'
```

## Frontend Integration

### Add Support Widget to Layout

Edit `packages/frontend/src/app/layout.tsx`:

```tsx
import { SupportWidget } from '@/components/beta/support-widget';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SupportWidget />
      </body>
    </html>
  );
}
```

### Track Analytics Events

In your components:

```tsx
import { analytics } from '@/lib/analytics';

// Track page view
useEffect(() => {
  analytics.pageView();
}, []);

// Track project creation
const handleCreateProject = async () => {
  const project = await createProject();
  analytics.projectCreated(project.id, 'en', 'es');
};
```

### Add Feedback Button

```tsx
import { FeedbackForm } from '@/components/beta/feedback-form';

<FeedbackForm 
  type="feature_request"
  onSuccess={() => toast.success('Thanks for your feedback!')}
/>
```

## Monitoring Beta Program

### Check Feedback

View all feedback:
```bash
curl http://localhost:3001/api/feedback/all \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Get feedback stats:
```bash
curl http://localhost:3001/api/feedback/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Check Analytics

View analytics stats:
```bash
curl http://localhost:3001/api/analytics/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

View feature adoption:
```bash
curl http://localhost:3001/api/analytics/adoption \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

View user funnel:
```bash
curl http://localhost:3001/api/analytics/funnel \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Check Support Tickets

View all tickets:
```bash
curl http://localhost:3001/api/support/admin/tickets \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Get support stats:
```bash
curl http://localhost:3001/api/support/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Database Queries

### Find Active Beta Testers

```sql
SELECT 
  u.email,
  u.beta_onboarded_at,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT f.id) as feedback_count
FROM users u
LEFT JOIN projects p ON p.user_id = u.id
LEFT JOIN feedback f ON f.user_id = u.id
WHERE u.is_beta_tester = true
GROUP BY u.id, u.email, u.beta_onboarded_at
ORDER BY project_count DESC;
```

### Get Recent Feedback

```sql
SELECT 
  f.type,
  f.category,
  f.rating,
  f.content,
  f.created_at,
  u.email
FROM feedback f
JOIN users u ON u.id = f.user_id
WHERE f.created_at >= NOW() - INTERVAL '7 days'
ORDER BY f.created_at DESC;
```

### Get Feature Adoption

```sql
SELECT 
  event_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  DATE(created_at) as date
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_name, DATE(created_at)
ORDER BY date DESC, unique_users DESC;
```

## Best Practices

1. **Generate codes in batches**: Create invite codes in batches and track distribution
2. **Monitor activation rate**: Check how many codes are being used
3. **Weekly check-ins**: Review stats weekly to identify trends
4. **Respond quickly**: Reply to support tickets within 24 hours
5. **Acknowledge feedback**: Let users know their feedback is valued
6. **Share updates**: Keep beta testers informed about changes

## Troubleshooting

### Migration Issues

If migration fails, check:
```bash
npx prisma migrate status
npx prisma migrate resolve --rolled-back 20251105000000_beta_testing
npx prisma migrate deploy
```

### Route Not Found

Verify routes are registered in `src/index.ts`:
```typescript
app.use('/api/beta', userRateLimiter, betaRoutes);
app.use('/api/feedback', userRateLimiter, feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', userRateLimiter, supportRoutes);
```

### Analytics Not Tracking

Check that:
1. Events are being sent from frontend
2. Session ID is being generated
3. API endpoint is accessible
4. No CORS issues

## Next Steps

1. Set up email notifications for new feedback/tickets
2. Create admin dashboard for monitoring
3. Implement automated weekly surveys
4. Set up Slack/Discord integration for support
5. Create beta tester recognition program
