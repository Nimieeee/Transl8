#!/usr/bin/env tsx
/**
 * Process expired grace periods and downgrade subscriptions
 * This script should be run as a scheduled job (e.g., daily cron job)
 */

import { processExpiredGracePeriods } from '../src/lib/payment-failures';
import { logger } from '../src/lib/logger';
import { prisma, disconnectPrisma } from '../src/lib/prisma';

async function main() {
  logger.info('Starting grace period processing job');

  try {
    await processExpiredGracePeriods();
    logger.info('Grace period processing completed successfully');
  } catch (error) {
    logger.error('Error processing grace periods:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();
