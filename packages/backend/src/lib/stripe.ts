/**
 * Stripe payment integration service
 */

import Stripe from 'stripe';
import { logger } from './logger';
import type { SubscriptionTier } from '../types/database';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.warn('STRIPE_SECRET_KEY not configured. Payment features will be disabled.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  : null;

// Stripe Price IDs for each subscription tier
export const STRIPE_PRICE_IDS: Record<Exclude<SubscriptionTier, 'FREE'>, string> = {
  CREATOR: process.env.STRIPE_PRICE_ID_CREATOR || '',
  PRO: process.env.STRIPE_PRICE_ID_PRO || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
};

/**
 * Create a Stripe checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  tier: Exclude<SubscriptionTier, 'FREE'>,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for tier: ${tier}`);
  }

  // Create or retrieve Stripe customer
  const customer = await getOrCreateCustomer(userId, userEmail);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
  });

  logger.info('Created Stripe checkout session', {
    sessionId: session.id,
    userId,
    tier,
  });

  return session;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  logger.info('Created Stripe customer', {
    customerId: customer.id,
    userId,
  });

  return customer;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(
  userId: string,
  userEmail: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const customer = await getOrCreateCustomer(userId, userEmail);

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  logger.info('Created billing portal session', {
    sessionId: session.id,
    userId,
  });

  return session;
}

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Failed to retrieve Stripe subscription', {
      subscriptionId,
      error,
    });
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  if (immediately) {
    // Cancel immediately
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info('Cancelled subscription immediately', { subscriptionId });
    return subscription;
  } else {
    // Cancel at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    logger.info('Scheduled subscription cancellation at period end', {
      subscriptionId,
    });
    return subscription;
  }
}

/**
 * Update subscription to a different tier (upgrade/downgrade)
 */
export async function updateSubscription(
  subscriptionId: string,
  newTier: Exclude<SubscriptionTier, 'FREE'>,
  prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const newPriceId = STRIPE_PRICE_IDS[newTier];
  if (!newPriceId) {
    throw new Error(`No Stripe price ID configured for tier: ${newTier}`);
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update subscription with new price
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorationBehavior,
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  });

  logger.info('Updated subscription tier', {
    subscriptionId,
    newTier,
    prorationBehavior,
  });

  return updatedSubscription;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Get customer's active subscriptions
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
  });

  return subscriptions.data;
}

/**
 * Get payment methods for a customer
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const customer = await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  logger.info('Updated default payment method', {
    customerId,
    paymentMethodId,
  });

  return customer;
}

/**
 * Get invoices for a customer
 */
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}
