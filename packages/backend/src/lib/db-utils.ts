import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Database utility functions for common operations
 */

/**
 * Execute a database operation with retry logic
 * Useful for handling transient connection issues
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2003', 'P2025'].includes(error.code)
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Execute multiple operations in a transaction
 */
export async function executeTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operations);
}

/**
 * Paginate query results
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export async function paginate<T>(
  model: any,
  where: any,
  params: PaginationParams = {},
  orderBy?: any
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    model.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Soft delete implementation (if needed in future)
 */
export async function softDelete(model: any, id: string): Promise<void> {
  await model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Bulk upsert helper
 */
export async function bulkUpsert<T>(model: any, data: T[], uniqueField: keyof T): Promise<void> {
  await prisma.$transaction(
    data.map((item: any) =>
      model.upsert({
        where: { [uniqueField]: item[uniqueField] },
        update: item,
        create: item,
      })
    )
  );
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [userCount, projectCount, transcriptCount, translationCount, voiceCloneCount, jobCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.transcript.count(),
      prisma.translation.count(),
      prisma.voiceClone.count(),
      prisma.job.count(),
    ]);

  return {
    users: userCount,
    projects: projectCount,
    transcripts: transcriptCount,
    translations: translationCount,
    voiceClones: voiceCloneCount,
    jobs: jobCount,
  };
}

/**
 * Clean up old records (for maintenance tasks)
 */
export async function cleanupOldRecords(daysOld: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  await prisma.$transaction([
    // Delete old completed jobs
    prisma.job.deleteMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          lt: cutoffDate,
        },
      },
    }),
    // Delete old failed projects
    prisma.project.deleteMany({
      where: {
        status: 'FAILED',
        updatedAt: {
          lt: cutoffDate,
        },
      },
    }),
  ]);
}

/**
 * Check if a user has reached their processing limit
 */
export async function checkProcessingLimit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      processingMinutesUsed: true,
      processingMinutesLimit: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.processingMinutesUsed < user.processingMinutesLimit;
}

/**
 * Update user processing minutes
 */
export async function updateProcessingMinutes(userId: string, minutesToAdd: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      processingMinutesUsed: {
        increment: minutesToAdd,
      },
    },
  });
}

/**
 * Get active jobs for a project
 */
export async function getActiveJobs(projectId: string) {
  return await prisma.job.findMany({
    where: {
      projectId,
      status: {
        in: ['PENDING', 'PROCESSING'],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Error code helpers
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaError(error) && error.code === 'P2002';
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return isPrismaError(error) && error.code === 'P2003';
}

export function isRecordNotFoundError(error: unknown): boolean {
  return isPrismaError(error) && error.code === 'P2025';
}

/**
 * Format Prisma error for user-friendly messages
 */
export function formatPrismaError(error: unknown): string {
  if (!isPrismaError(error)) {
    return 'An unexpected database error occurred';
  }

  switch (error.code) {
    case 'P2002':
      return 'A record with this value already exists';
    case 'P2003':
      return 'Referenced record does not exist';
    case 'P2025':
      return 'Record not found';
    case 'P2014':
      return 'Invalid relationship data';
    default:
      return `Database error: ${error.message}`;
  }
}
