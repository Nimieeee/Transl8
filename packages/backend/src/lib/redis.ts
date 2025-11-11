import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
// Note: maxRetriesPerRequest must be null for BullMQ compatibility
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

/**
 * Store refresh token in Redis with expiry
 */
export async function storeRefreshToken(
  userId: string,
  token: string,
  expiryInSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<void> {
  const key = `refresh_token:${userId}:${token}`;
  await redis.setex(key, expiryInSeconds, '1');
}

/**
 * Check if refresh token exists in Redis
 */
export async function isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
  const key = `refresh_token:${userId}:${token}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Invalidate a specific refresh token
 */
export async function invalidateRefreshToken(userId: string, token: string): Promise<void> {
  const key = `refresh_token:${userId}:${token}`;
  await redis.del(key);
}

/**
 * Invalidate all refresh tokens for a user
 */
export async function invalidateAllUserTokens(userId: string): Promise<void> {
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Check Redis connection
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
