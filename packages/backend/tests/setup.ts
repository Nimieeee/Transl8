import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dubbing_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test database and redis clients
let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Initialize test Redis
  redis = new Redis(process.env.REDIS_URL);

  // Run migrations
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'ignore',
    });
  } catch (error) {
    console.warn('Migration failed, database may already be set up');
  }
});

afterAll(async () => {
  // Cleanup
  if (prisma) {
    await prisma.$disconnect();
  }
  if (redis) {
    await redis.quit();
  }
});

// Clean database between tests
afterEach(async () => {
  if (prisma) {
    // Delete in reverse order of dependencies
    await prisma.syncQualityMetrics.deleteMany();
    await prisma.audioQualityMetrics.deleteMany();
    await prisma.adaptationMetrics.deleteMany();
    await prisma.contextMap.deleteMany();
    await prisma.dubbingJob.deleteMany();
    await prisma.user.deleteMany();
  }

  if (redis) {
    await redis.flushdb();
  }
});

export { prisma, redis };
