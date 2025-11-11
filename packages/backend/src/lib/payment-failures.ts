/**
 * Payment failure handling and dunning management
 */

import { prisma } from './prisma';
import { logger } from './logger';
import type { SubscriptionTier } from '../types/database';

// Grace period configuration (in days)
const GRACE_PERIOD_DAYS = 7;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Handle payment failure with retry logic
 */
export async function handlePaymentFailure(
  userId: string,
  invoiceId: string,
  attemptCount: number,
  nextRetryDate?: Date
): Promise<void> {
  logger.warn('Payment failure detected', {
    userId,
    invoiceId,
    attemptCount,
    nextRetryDate,
  });

  // Update user subscription status
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  // Send email notification based on attempt count
  if (attemptCount === 1) {
    await sendPaymentFailureEmail(userId, 'first_attempt', nextRetryDate);
  } else if (attemptCount === 2) {
    await sendPaymentFailureEmail(userId, 'second_attempt', nextRetryDate);
  } else if (attemptCount >= MAX_RETRY_ATTEMPTS) {
    await sendPaymentFailureEmail(userId, 'final_attempt', nextRetryDate);

    // Start grace period
    await startGracePeriod(userId);
  }
}

/**
 * Start grace period before downgrading subscription
 */
async function startGracePeriod(userId: string): Promise<void> {
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  logger.info('Starting grace period', {
    userId,
    gracePeriodEnd,
  });

  // Store grace period end date in user metadata
  // Note: You may want to add a gracePeriodEnd field to the User model
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'grace_period',
    },
  });

  // Schedule downgrade job for after grace period
  await scheduleGracePeriodExpiration(userId, gracePeriodEnd);
}

/**
 * Schedule grace period expiration check
 */
async function scheduleGracePeriodExpiration(userId: string, expirationDate: Date): Promise<void> {
  // This would typically use a job queue or scheduled task
  // For now, we'll log it
  logger.info('Grace period expiration scheduled', {
    userId,
    expirationDate,
  });

  // TODO: Implement with BullMQ delayed job
  // const { getQueue } = await import('./queue');
  // const gracePeriodQueue = getQueue('grace-period');
  // await gracePeriodQueue.add(
  //   'check-expiration',
  //   { userId },
  //   { delay: expirationDate.getTime() - Date.now() }
  // );
}

/**
 * Check and process expired grace periods
 */
export async function processExpiredGracePeriods(): Promise<void> {
  // Find users in grace period with expired period
  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'grace_period',
      // Add grace period end date check when field is added
    },
  });

  for (const user of users) {
    await downgradeAfterGracePeriod(user.id);
  }
}

/**
 * Downgrade user subscription after grace period expires
 */
async function downgradeAfterGracePeriod(userId: string): Promise<void> {
  logger.info('Downgrading subscription after grace period', { userId });

  // Downgrade to FREE tier
  const { upgradeSubscription } = await import('./subscription');
  await upgradeSubscription(userId, 'FREE');

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });

  // Send downgrade notification email
  await sendDowngradeEmail(userId);
}

/**
 * Handle successful payment after failure
 */
export async function handlePaymentRecovery(userId: string, invoiceId: string): Promise<void> {
  logger.info('Payment recovered', { userId, invoiceId });

  // Update subscription status back to active
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'active',
    },
  });

  // Send recovery confirmation email
  await sendPaymentRecoveryEmail(userId);
}

/**
 * Send payment failure email notification
 */
async function sendPaymentFailureEmail(
  userId: string,
  attemptType: 'first_attempt' | 'second_attempt' | 'final_attempt',
  nextRetryDate?: Date
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, subscriptionTier: true },
  });

  if (!user) {
    logger.error('User not found for payment failure email', { userId });
    return;
  }

  const emailContent = getPaymentFailureEmailContent(
    attemptType,
    user.subscriptionTier,
    nextRetryDate
  );

  logger.info('Sending payment failure email', {
    userId,
    email: user.email,
    attemptType,
  });

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // await sendEmail({
  //   to: user.email,
  //   subject: emailContent.subject,
  //   html: emailContent.html,
  // });

  console.log('Payment failure email would be sent:', {
    to: user.email,
    subject: emailContent.subject,
  });
}

/**
 * Send downgrade notification email
 */
async function sendDowngradeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    logger.error('User not found for downgrade email', { userId });
    return;
  }

  logger.info('Sending downgrade notification email', {
    userId,
    email: user.email,
  });

  // TODO: Integrate with email service
  console.log('Downgrade email would be sent:', {
    to: user.email,
    subject: 'Your subscription has been downgraded',
  });
}

/**
 * Send payment recovery email
 */
async function sendPaymentRecoveryEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    logger.error('User not found for recovery email', { userId });
    return;
  }

  logger.info('Sending payment recovery email', {
    userId,
    email: user.email,
  });

  // TODO: Integrate with email service
  console.log('Payment recovery email would be sent:', {
    to: user.email,
    subject: 'Your payment has been processed successfully',
  });
}

/**
 * Get email content for payment failure notifications
 */
function getPaymentFailureEmailContent(
  attemptType: 'first_attempt' | 'second_attempt' | 'final_attempt',
  tier: SubscriptionTier,
  nextRetryDate?: Date
): { subject: string; html: string } {
  const retryDateStr = nextRetryDate ? nextRetryDate.toLocaleDateString() : 'soon';

  switch (attemptType) {
    case 'first_attempt':
      return {
        subject: 'Payment Failed - Action Required',
        html: `
          <h2>Payment Failed</h2>
          <p>We were unable to process your payment for your ${tier} subscription.</p>
          <p>We'll automatically retry the payment on ${retryDateStr}.</p>
          <p>Please update your payment method to avoid service interruption.</p>
          <a href="${process.env.FRONTEND_URL}/settings">Update Payment Method</a>
        `,
      };

    case 'second_attempt':
      return {
        subject: 'Second Payment Attempt Failed',
        html: `
          <h2>Payment Failed Again</h2>
          <p>We've attempted to process your payment twice without success.</p>
          <p>We'll make one more attempt on ${retryDateStr}.</p>
          <p>Please update your payment method immediately to maintain your ${tier} subscription.</p>
          <a href="${process.env.FRONTEND_URL}/settings">Update Payment Method</a>
        `,
      };

    case 'final_attempt':
      return {
        subject: 'Final Payment Attempt Failed - Grace Period Started',
        html: `
          <h2>Final Payment Attempt Failed</h2>
          <p>We've been unable to process your payment after multiple attempts.</p>
          <p>Your account has entered a ${GRACE_PERIOD_DAYS}-day grace period.</p>
          <p>If payment is not received within ${GRACE_PERIOD_DAYS} days, your subscription will be downgraded to the FREE tier.</p>
          <p>Please update your payment method immediately to avoid losing access to ${tier} features.</p>
          <a href="${process.env.FRONTEND_URL}/settings">Update Payment Method</a>
        `,
      };
  }
}

/**
 * Get subscription status with grace period information
 */
export async function getSubscriptionStatusWithGracePeriod(userId: string): Promise<{
  status: string;
  inGracePeriod: boolean;
  gracePeriodEndsAt?: Date;
  daysRemaining?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      // Add gracePeriodEnd when field is added to schema
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const inGracePeriod = user.subscriptionStatus === 'grace_period';

  // Calculate days remaining if in grace period
  // This would use the gracePeriodEnd field when added
  const daysRemaining = inGracePeriod ? GRACE_PERIOD_DAYS : undefined;

  return {
    status: user.subscriptionStatus || 'inactive',
    inGracePeriod,
    daysRemaining,
  };
}
