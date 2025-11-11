/**
 * Subscription management routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getSubscriptionDetails,
  getAllTiers,
  upgradeSubscription,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '../lib/subscription';
import {
  createCheckoutSession,
  createBillingPortalSession,
  verifyWebhookSignature,
} from '../lib/stripe';
import { logger } from '../lib/logger';

// Valid subscription tiers
const VALID_TIERS = ['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'];

const router = Router();

/**
 * GET /api/subscription
 * Get current user's subscription details
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const details = await getSubscriptionDetails(req.user.userId);

    // Get grace period information if applicable
    const { getSubscriptionStatusWithGracePeriod } = await import('../lib/payment-failures');
    const gracePeriodInfo = await getSubscriptionStatusWithGracePeriod(req.user.userId);

    res.json({
      subscription: {
        ...details,
        gracePeriod: gracePeriodInfo.inGracePeriod
          ? {
              active: true,
              daysRemaining: gracePeriodInfo.daysRemaining,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Error fetching subscription details:', error);
    res.status(500).json({
      error: {
        code: 'SUBSCRIPTION_FETCH_FAILED',
        message: 'Failed to fetch subscription details',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/subscription/tiers
 * Get all available subscription tiers with features
 */
router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    const tiers = getAllTiers();
    res.json({ tiers });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({
      error: {
        code: 'TIERS_FETCH_FAILED',
        message: 'Failed to fetch subscription tiers',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/checkout
 * Create Stripe checkout session for subscription upgrade
 * Body: { tier: 'CREATOR' | 'PRO' | 'ENTERPRISE' }
 */
router.post('/checkout', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { tier } = req.body;

    // Validate tier (cannot checkout for FREE tier)
    if (!tier || tier === 'FREE' || !VALID_TIERS.includes(tier)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TIER',
          message: 'Valid paid subscription tier is required',
          retryable: false,
        },
      });
      return;
    }

    // Get user email
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          retryable: false,
        },
      });
      return;
    }

    // Create Stripe checkout session
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await createCheckoutSession(
      req.user.userId,
      user.email,
      tier,
      `${baseUrl}/settings?subscription=success`,
      `${baseUrl}/settings?subscription=cancelled`
    );

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({
      error: {
        code: 'CHECKOUT_FAILED',
        message: 'Failed to create checkout session',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/portal
 * Create Stripe billing portal session for subscription management
 */
router.post('/portal', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    // Get user email
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          retryable: false,
        },
      });
      return;
    }

    // Create billing portal session
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await createBillingPortalSession(
      req.user.userId,
      user.email,
      `${baseUrl}/settings`
    );

    res.json({
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating billing portal session:', error);
    res.status(500).json({
      error: {
        code: 'PORTAL_FAILED',
        message: 'Failed to create billing portal session',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/change-tier
 * Change user's subscription tier (upgrade or downgrade)
 * Body: { tier: 'CREATOR' | 'PRO' | 'ENTERPRISE', immediate?: boolean }
 */
router.post('/change-tier', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { tier, immediate } = req.body;

    // Validate tier (cannot change to FREE via this endpoint)
    if (!tier || tier === 'FREE' || !VALID_TIERS.includes(tier)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TIER',
          message: 'Valid paid subscription tier is required',
          retryable: false,
        },
      });
      return;
    }

    // Get user's current subscription
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        stripeSubscriptionId: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          retryable: false,
        },
      });
      return;
    }

    if (!user.stripeSubscriptionId) {
      res.status(400).json({
        error: {
          code: 'NO_ACTIVE_SUBSCRIPTION',
          message: 'No active subscription found. Please create a new subscription.',
          retryable: false,
        },
      });
      return;
    }

    // Update Stripe subscription with proration
    const { updateSubscription } = await import('../lib/stripe');
    const prorationBehavior = immediate ? 'always_invoice' : 'create_prorations';
    
    await updateSubscription(
      user.stripeSubscriptionId,
      tier,
      prorationBehavior
    );

    // Update local database
    await upgradeSubscription(req.user.userId, tier);

    const details = await getSubscriptionDetails(req.user.userId);

    res.json({
      message: 'Subscription tier changed successfully',
      subscription: details,
    });
  } catch (error) {
    logger.error('Error changing subscription tier:', error);
    res.status(500).json({
      error: {
        code: 'TIER_CHANGE_FAILED',
        message: 'Failed to change subscription tier',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel user's subscription
 * Body: { immediately?: boolean }
 */
router.post('/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { immediately } = req.body;

    // Get user's current subscription
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        stripeSubscriptionId: true,
      },
    });

    if (!user || !user.stripeSubscriptionId) {
      res.status(400).json({
        error: {
          code: 'NO_ACTIVE_SUBSCRIPTION',
          message: 'No active subscription found',
          retryable: false,
        },
      });
      return;
    }

    // Cancel Stripe subscription
    const { cancelSubscription } = await import('../lib/stripe');
    const subscription = await cancelSubscription(
      user.stripeSubscriptionId,
      immediately === true
    );

    // Update local database
    if (immediately) {
      await upgradeSubscription(req.user.userId, 'FREE');
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          subscriptionStatus: 'cancelled',
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }

    res.json({
      message: immediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      periodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      error: {
        code: 'CANCEL_FAILED',
        message: 'Failed to cancel subscription',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/subscription/payment-methods
 * Get user's payment methods
 */
router.get('/payment-methods', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      res.json({ paymentMethods: [] });
      return;
    }

    const { getCustomerPaymentMethods } = await import('../lib/stripe');
    const paymentMethods = await getCustomerPaymentMethods(user.stripeCustomerId);

    res.json({
      paymentMethods: paymentMethods.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
      })),
    });
  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({
      error: {
        code: 'PAYMENT_METHODS_FETCH_FAILED',
        message: 'Failed to fetch payment methods',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/payment-methods/default
 * Set default payment method
 * Body: { paymentMethodId: string }
 */
router.post('/payment-methods/default', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      res.status(400).json({
        error: {
          code: 'MISSING_PAYMENT_METHOD',
          message: 'Payment method ID is required',
          retryable: false,
        },
      });
      return;
    }

    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      res.status(400).json({
        error: {
          code: 'NO_CUSTOMER',
          message: 'No Stripe customer found',
          retryable: false,
        },
      });
      return;
    }

    const { setDefaultPaymentMethod } = await import('../lib/stripe');
    await setDefaultPaymentMethod(user.stripeCustomerId, paymentMethodId);

    res.json({
      message: 'Default payment method updated successfully',
    });
  } catch (error) {
    logger.error('Error setting default payment method:', error);
    res.status(500).json({
      error: {
        code: 'SET_DEFAULT_FAILED',
        message: 'Failed to set default payment method',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/subscription/invoices
 * Get user's billing history
 */
router.get('/invoices', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
      return;
    }

    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      res.json({ invoices: [] });
      return;
    }

    const { getCustomerInvoices } = await import('../lib/stripe');
    const limit = parseInt(req.query.limit as string) || 10;
    const invoices = await getCustomerInvoices(user.stripeCustomerId, limit);

    res.json({
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        created: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
      })),
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({
      error: {
        code: 'INVOICES_FETCH_FAILED',
        message: 'Failed to fetch invoices',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/subscription/webhook
 * Webhook handler for Stripe payment events
 * This endpoint receives payment confirmation events from Stripe
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    logger.error('Missing Stripe signature or webhook secret');
    res.status(400).json({
      error: {
        code: 'WEBHOOK_CONFIG_ERROR',
        message: 'Webhook configuration error',
        retryable: false,
      },
    });
    return;
  }

  try {
    // Verify webhook signature
    const event = verifyWebhookSignature(
      req.body,
      sig as string,
      webhookSecret
    );

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.mode === 'subscription') {
          await handleSubscriptionCreated(session);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        logger.info('Payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
        });

        // Check if this was a recovery from failed payment
        const { prisma } = await import('../lib/prisma');
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: invoice.customer },
          select: { id: true, subscriptionStatus: true },
        });

        if (user && (user.subscriptionStatus === 'past_due' || user.subscriptionStatus === 'grace_period')) {
          const { handlePaymentRecovery } = await import('../lib/payment-failures');
          await handlePaymentRecovery(user.id, invoice.id);
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    res.status(400).json({
      error: {
        code: 'WEBHOOK_ERROR',
        message: error.message || 'Failed to process webhook',
        retryable: false,
      },
    });
  }
});

export default router;
