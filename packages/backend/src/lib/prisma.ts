import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection pool configuration
export const configurePrisma = () => {
  // Prisma automatically handles connection pooling
  // Default pool size is calculated based on: num_physical_cpus * 2 + 1
  // Can be overridden via DATABASE_URL connection_limit parameter
  // Example: postgresql://user:password@localhost:5432/db?connection_limit=10
  
  return prisma;
};

// Graceful shutdown
export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

// Health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};
