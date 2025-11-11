// @ts-nocheck
/**
 * Subscription tier management and enforcement
 */

import { prisma } from './prisma';
import type { SubscriptionTier, User } from '../types/database';

// Subscription tier limits configuration
export const SUBSCRIPTION_TIER_LIMITS: Record<
  SubscriptionTier,
  {
    processingMinutes: number;
    voiceCloneSlots: number;
    hasWatermark: boolean;
    hasLipSync: boolean;
    priority: number;
    displayName: string;
    price: number;
  }
> = {
  FREE: {
    processingMinutes: 10,
    voiceCloneSlots: 0,
    hasWatermark: true,
    hasLipSync: false,
    priority: 1,
    displayName: 'Free',
    price: 0,
  },
  CREATOR: {
    processingMinutes: 120,
    voiceCloneSlots: 3,
    hasWatermark: false,
    hasLipSync: false,
    priority: 2,
    displayName: 'Creator',
    price: 29,
  },
  PRO: {
    processingMinutes: -1, // Unlimited (-1 indicates unlimited)
    voiceCloneSlots: 10,
    hasWatermark: false,
    hasLipSync: true,
    priority: 3,
    displayName: 'Pro',
    price: 99,
  },
  ENTERPRISE: {
    processingMinutes: -1, // Unlimited
    voiceCloneSlots: -1, // Unlimited
    hasWatermark: false,
    hasLipSync: true,
    priority: 4,
    displayName: 'Enterprise',
    price: 499,
  },
};

export interface TierLimits {
  processingMinutes: number;
  voiceCloneSlots: number;
  hasWatermark: boolean;
  hasLipSync: boolean;
  priority: number;
  displayName: string;
  price: number;
}

/**
 * Get tier limits for a subscription tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return SUBSCRIPTION_TIER_LIMITS[tier];
}

/**
 * Check if user has sufficient quota for processing
 */
export async function checkProcessingQuota(
  userId: string,
  durationMinutes: number
): Promise<{ allowed: boolean; reason?: string; remainingMinutes?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      processingMinutesUsed: true,
      processingMinutesLimit: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const tierLimits = getTierLimits(user.subscriptionTier);

  // Unlimited tiers (PRO, ENTERPRISE)
  if (tierLimits.processingMinutes === -1) {
    return { allowed: true, remainingMinutes: -1 };
  }

  const remainingMinutes = user.processingMinutesLimit - user.processingMinutesUsed;

  if (remainingMinutes < durationMinutes) {
    return {
      allowed: false,
      reason: 'Insufficient processing quota',
      remainingMinutes,
    };
  }

  return { allowed: true, remainingMinutes };
}

/**
 * Track processing time usage for a user
 */
export async function trackProcessingUsage(userId: string, durationMinutes: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      processingMinutesUsed: {
        increment: durationMinutes,
      },
    },
  });
}

/**
 * Check if user can create more voice clones
 */
export async function checkVoiceCloneQuota(
  userId: string
): Promise<{ allowed: boolean; reason?: string; remainingSlots?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      voiceCloneSlots: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const tierLimits = getTierLimits(user.subscriptionTier);

  // Unlimited voice clones (ENTERPRISE)
  if (tierLimits.voiceCloneSlots === -1) {
    return { allowed: true, remainingSlots: -1 };
  }

  // Free tier has no voice clone slots
  if (tierLimits.voiceCloneSlots === 0) {
    return {
      allowed: false,
      reason: 'Voice cloning requires Creator tier or higher',
      remainingSlots: 0,
    };
  }

  const currentClones = await prisma.voiceClone.count({
    where: { userId },
  });

  const remainingSlots = tierLimits.voiceCloneSlots - currentClones;

  if (remainingSlots <= 0) {
    return {
      allowed: false,
      reason: 'Voice clone slot limit reached',
      remainingSlots: 0,
    };
  }

  return { allowed: true, remainingSlots };
}

/**
 * Check if user has access to lip-sync feature
 */
export function hasLipSyncAccess(tier: SubscriptionTier): boolean {
  return getTierLimits(tier).hasLipSync;
}

/**
 * Check if user's videos should have watermark
 */
export function shouldApplyWatermark(tier: SubscriptionTier): boolean {
  return getTierLimits(tier).hasWatermark;
}

/**
 * Reset monthly processing quota (called by scheduled job)
 */
export async function resetMonthlyQuota(): Promise<void> {
  // Reset all users' processing minutes used to 0
  await prisma.user.updateMany({
    data: {
      processingMinutesUsed: 0,
    },
  });
}

/**
 * Upgrade user subscription tier
 */
export async function upgradeSubscription(
  userId: string,
  newTier: SubscriptionTier
): Promise<User> {
  const tierLimits = getTierLimits(newTier);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: newTier,
      processingMinutesLimit:
        tierLimits.processingMinutes === -1 ? 999999 : tierLimits.processingMinutes,
      voiceCloneSlots: tierLimits.voiceCloneSlots === -1 ? 999 : tierLimits.voiceCloneSlots,
    },
  });

  return user;
}

/**
 * Get subscription details for a user
 */
export async function getSubscriptionDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      processingMinutesUsed: true,
      processingMinutesLimit: true,
      voiceCloneSlots: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tierLimits = getTierLimits(user.subscriptionTier);
  const voiceCloneCount = await prisma.voiceClone.count({
    where: { userId },
  });

  return {
    tier: user.subscriptionTier,
    tierDetails: tierLimits,
    usage: {
      processingMinutesUsed: user.processingMinutesUsed,
      processingMinutesLimit: user.processingMinutesLimit,
      processingMinutesRemaining:
        tierLimits.processingMinutes === -1
          ? -1
          : user.processingMinutesLimit - user.processingMinutesUsed,
      voiceClonesUsed: voiceCloneCount,
      voiceClonesLimit: user.voiceCloneSlots,
      voiceClonesRemaining:
        tierLimits.voiceCloneSlots === -1 ? -1 : user.voiceCloneSlots - voiceCloneCount,
    },
  };
}

/**
 * Get all available subscription tiers with their features
 */
export function getAllTiers() {
  return Object.entries(SUBSCRIPTION_TIER_LIMITS).map(([tier, limits]) => ({
    tier: tier as SubscriptionTier,
    ...limits,
    features: {
      processingMinutes:
        limits.processingMinutes === -1 ? 'Unlimited' : `${limits.processingMinutes} minutes/month`,
      voiceClones:
        limits.voiceCloneSlots === -1 ? 'Unlimited' : `${limits.voiceCloneSlots} voice clones`,
      watermark: limits.hasWatermark ? 'Yes' : 'No',
      lipSync: limits.hasLipSync ? 'Included' : 'Not available',
      priority: `Priority ${limits.priority}`,
    },
  }));
}

/**
 * Handle Stripe subscription created event
 */
export async function handleSubscriptionCreated(session: any): Promise<void> {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier;

  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata');
    return;
  }

  const subscriptionId = session.subscription;
  const customerId = session.customer;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
    },
  });

  // Upgrade the user's subscription tier
  await upgradeSubscription(userId, tier);

  console.log('Subscription created', { userId, tier, subscriptionId });
}

/**
 * Handle Stripe subscription updated event
 */
export async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier as SubscriptionTier;

  if (!userId) {
    // Try to find user by subscription ID
    const user = await prisma.user.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) {
      console.error('User not found for subscription', subscription.id);
      return;
    }

    await updateUserSubscriptionStatus(user.id, subscription, tier);
  } else {
    await updateUserSubscriptionStatus(userId, subscription, tier);
  }
}

/**
 * Handle Stripe subscription deleted event
 */
export async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error('User not found for subscription', subscription.id);
    return;
  }

  // Downgrade to FREE tier
  await upgradeSubscription(user.id, 'FREE');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });

  console.log('Subscription cancelled', { userId: user.id });
}

/**
 * Handle Stripe payment failed event
 */
export async function handlePaymentFailed(invoice: any): Promise<void> {
  const customerId = invoice.customer;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer', customerId);
    return;
  }

  // Import payment failure handler
  const { handlePaymentFailure } = await import('./payment-failures');

  // Calculate next retry date (Stripe typically retries after a few days)
  const nextRetryDate = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000)
    : undefined;

  await handlePaymentFailure(user.id, invoice.id, invoice.attempt_count || 1, nextRetryDate);
}

/**
 * Update user subscription status from Stripe subscription object
 */
async function updateUserSubscriptionStatus(
  userId: string,
  subscription: any,
  tier?: SubscriptionTier
): Promise<void> {
  const status = subscription.status;
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
    },
  });

  // Update tier if provided and subscription is active
  if (tier && status === 'active') {
    await upgradeSubscription(userId, tier);
  }

  console.log('Subscription status updated', {
    userId,
    status,
    tier,
    cancelAtPeriodEnd,
  });
}
