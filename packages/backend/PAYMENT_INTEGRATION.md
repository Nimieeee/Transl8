# Payment Integration Guide

This document describes the Stripe payment integration for subscription management in the AI Video Dubbing Platform.

## Overview

The platform uses Stripe for payment processing, subscription management, and billing. The integration includes:

- Stripe Checkout for subscription upgrades
- Billing Portal for subscription management
- Webhook handling for payment events
- Automatic payment retry logic
- Grace period management for failed payments
- Email notifications for payment events

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRICE_ID_CREATOR=price_creator_monthly
STRIPE_PRICE_ID_PRO=price_pro_monthly
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_monthly
FRONTEND_URL=http://localhost:3000
```

### Stripe Setup

1. **Create a Stripe Account**: Sign up at https://stripe.com

2. **Create Products and Prices**:
   - Go to Products in Stripe Dashboard
   - Create products for each tier (Creator, Pro, Enterprise)
   - Create recurring monthly prices for each product
   - Copy the price IDs to your environment variables

3. **Configure Webhook**:
   - Go to Developers > Webhooks in Stripe Dashboard
   - Add endpoint: `https://your-domain.com/api/subscription/webhook`
   - Select events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

4. **Configure Billing Portal**:
   - Go to Settings > Billing > Customer Portal
   - Enable customer portal
   - Configure allowed actions (cancel subscription, update payment method, etc.)

## API Endpoints

### Create Checkout Session

Create a Stripe Checkout session for subscription upgrade.

```
POST /api/subscription/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "CREATOR" | "PRO" | "ENTERPRISE"
}
```

Response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Create Billing Portal Session

Create a Stripe Billing Portal session for subscription management.

```
POST /api/subscription/portal
Authorization: Bearer <token>
```

Response:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### Change Subscription Tier

Upgrade or downgrade subscription tier with proration.

```
POST /api/subscription/change-tier
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "CREATOR" | "PRO" | "ENTERPRISE",
  "immediate": false
}
```

### Cancel Subscription

Cancel subscription immediately or at period end.

```
POST /api/subscription/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "immediately": false
}
```

### Get Payment Methods

Get user's saved payment methods.

```
GET /api/subscription/payment-methods
Authorization: Bearer <token>
```

### Set Default Payment Method

Set default payment method for future charges.

```
POST /api/subscription/payment-methods/default
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_..."
}
```

### Get Billing History

Get user's invoice history.

```
GET /api/subscription/invoices?limit=10
Authorization: Bearer <token>
```

## Payment Failure Handling

### Automatic Retry Logic

When a payment fails, Stripe automatically retries according to its Smart Retries logic:

1. **First Attempt**: Initial payment attempt fails
2. **Second Attempt**: Retry after 3 days
3. **Third Attempt**: Retry after 5 days
4. **Final Attempt**: Retry after 7 days

### Email Notifications

Users receive email notifications at each stage:

- **First Failure**: "Payment Failed - Action Required"
- **Second Failure**: "Second Payment Attempt Failed"
- **Final Failure**: "Final Payment Attempt Failed - Grace Period Started"

### Grace Period

After all retry attempts fail, the user enters a 7-day grace period:

- User retains access to their subscription tier
- User receives notification about grace period
- If payment is not received within 7 days, subscription is downgraded to FREE tier

### Grace Period Processing

Run the grace period processing job daily:

```bash
npm run process-grace-periods
```

Or set up a cron job:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/backend && npm run process-grace-periods
```

## Webhook Events

### checkout.session.completed

Triggered when a user completes checkout. Creates or updates subscription.

### customer.subscription.created/updated

Triggered when subscription is created or updated. Updates user's subscription tier and status.

### customer.subscription.deleted

Triggered when subscription is cancelled. Downgrades user to FREE tier.

### invoice.payment_failed

Triggered when payment fails. Initiates retry logic and sends notifications.

### invoice.payment_succeeded

Triggered when payment succeeds. If recovering from failure, updates status and sends confirmation.

## Database Schema

The following fields are added to the User model:

```prisma
model User {
  // ... existing fields
  stripeCustomerId        String?       @unique
  stripeSubscriptionId    String?       @unique
  subscriptionStatus      String?       @default("inactive")
  subscriptionPeriodEnd   DateTime?
  cancelAtPeriodEnd       Boolean       @default(false)
}
```

### Subscription Status Values

- `inactive`: No active subscription
- `active`: Subscription is active and paid
- `past_due`: Payment failed, in retry period
- `grace_period`: All retries failed, in grace period
- `cancelled`: Subscription cancelled

## Testing

### Test Mode

Use Stripe test mode for development:

1. Use test API keys (starting with `sk_test_` and `pk_test_`)
2. Use test card numbers: https://stripe.com/docs/testing

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/subscription/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

## Security Considerations

1. **Webhook Signature Verification**: All webhooks are verified using Stripe's signature
2. **Raw Body Parsing**: Webhook endpoint uses raw body for signature verification
3. **Idempotency**: Webhook handlers are idempotent to handle duplicate events
4. **Error Handling**: Failed webhook processing is logged but doesn't block Stripe

## Monitoring

Monitor the following metrics:

- Payment success rate
- Failed payment recovery rate
- Grace period conversions
- Subscription churn rate
- Average revenue per user (ARPU)

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook secret is correct
3. Check Stripe Dashboard > Developers > Webhooks for delivery status
4. Review server logs for errors

### Payment Failures

1. Check Stripe Dashboard > Payments for failure reasons
2. Review user's payment method status
3. Check if card is expired or has insufficient funds
4. Verify billing address is complete

### Subscription Not Updating

1. Check webhook events are being received
2. Review server logs for processing errors
3. Verify database connection is working
4. Check user's Stripe customer ID is correct

## Support

For Stripe-specific issues, refer to:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com
