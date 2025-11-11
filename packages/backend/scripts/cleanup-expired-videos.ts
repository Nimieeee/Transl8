#!/usr/bin/env ts-node
/**
 * Cleanup Script for Expired Videos
 * 
 * This script removes expired dubbing jobs and their associated files.
 * Should be run periodically (e.g., via cron job) to free up disk space.
 * 
 * Requirements: 5.3
 */

import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

interface CleanupStats {
  jobsProcessed: number;
  jobsDeleted: number;
  filesDeleted: number;
  bytesFreed: number;
  errors: number;
}

/**
 * Delete a file and return the size freed
 */
async function deleteFile(filePath: string): Promise<number> {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      fs.unlinkSync(filePath);
      console.log(`  Deleted file: ${filePath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
      return size;
    }
    return 0;
  } catch (error) {
    console.error(`  Error deleting file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete temporary directory for a job
 */
async function deleteTempDirectory(jobId: string): Promise<number> {
  const tempDir = path.join(process.cwd(), 'temp', jobId);
  let bytesFreed = 0;

  try {
    if (fs.existsSync(tempDir)) {
      // Get all files in directory
      const files = fs.readdirSync(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        bytesFreed += stats.size;
        fs.unlinkSync(filePath);
      }

      // Remove directory
      fs.rmdirSync(tempDir);
      console.log(`  Deleted temp directory: ${tempDir} (${(bytesFreed / 1024 / 1024).toFixed(2)} MB)`);
    }
  } catch (error) {
    console.error(`  Error deleting temp directory ${tempDir}:`, error);
    throw error;
  }

  return bytesFreed;
}

/**
 * Clean up expired dubbing jobs
 */
async function cleanupExpiredJobs(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    jobsProcessed: 0,
    jobsDeleted: 0,
    filesDeleted: 0,
    bytesFreed: 0,
    errors: 0,
  };

  try {
    console.log('Starting cleanup of expired dubbing jobs...');
    console.log(`Current time: ${new Date().toISOString()}`);

    // Find all expired jobs
    const expiredJobs = await prisma.dubbingJob.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        status: 'completed', // Only clean up completed jobs
      },
    });

    console.log(`Found ${expiredJobs.length} expired jobs to clean up`);

    for (const job of expiredJobs) {
      stats.jobsProcessed++;
      console.log(`\nProcessing job ${job.id}:`);
      console.log(`  Created: ${job.createdAt.toISOString()}`);
      console.log(`  Expired: ${job.expiresAt?.toISOString()}`);

      try {
        // Delete original file
        if (job.originalFile) {
          try {
            stats.bytesFreed += await deleteFile(job.originalFile);
            stats.filesDeleted++;
          } catch (error) {
            console.error(`  Failed to delete original file:`, error);
            stats.errors++;
          }
        }

        // Delete output file
        if (job.outputFile) {
          try {
            stats.bytesFreed += await deleteFile(job.outputFile);
            stats.filesDeleted++;
          } catch (error) {
            console.error(`  Failed to delete output file:`, error);
            stats.errors++;
          }
        }

        // Delete temp directory
        try {
          stats.bytesFreed += await deleteTempDirectory(job.id);
        } catch (error) {
          console.error(`  Failed to delete temp directory:`, error);
          stats.errors++;
        }

        // Delete job record from database
        await prisma.dubbingJob.delete({
          where: { id: job.id },
        });

        stats.jobsDeleted++;
        console.log(`  Job ${job.id} cleaned up successfully`);
      } catch (error) {
        console.error(`  Error cleaning up job ${job.id}:`, error);
        stats.errors++;
      }
    }

    console.log('\n=== Cleanup Summary ===');
    console.log(`Jobs processed: ${stats.jobsProcessed}`);
    console.log(`Jobs deleted: ${stats.jobsDeleted}`);
    console.log(`Files deleted: ${stats.filesDeleted}`);
    console.log(`Space freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
    throw error;
  }
}

/**
 * Clean up failed jobs older than 7 days
 */
async function cleanupOldFailedJobs(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    jobsProcessed: 0,
    jobsDeleted: 0,
    filesDeleted: 0,
    bytesFreed: 0,
    errors: 0,
  };

  try {
    console.log('\nStarting cleanup of old failed jobs...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find failed jobs older than 7 days
    const oldFailedJobs = await prisma.dubbingJob.findMany({
      where: {
        status: 'failed',
        createdAt: {
          lte: sevenDaysAgo,
        },
      },
    });

    console.log(`Found ${oldFailedJobs.length} old failed jobs to clean up`);

    for (const job of oldFailedJobs) {
      stats.jobsProcessed++;
      console.log(`\nProcessing failed job ${job.id}:`);

      try {
        // Delete original file if it exists
        if (job.originalFile) {
          try {
            stats.bytesFreed += await deleteFile(job.originalFile);
            stats.filesDeleted++;
          } catch (error) {
            console.error(`  Failed to delete original file:`, error);
            stats.errors++;
          }
        }

        // Delete temp directory
        try {
          stats.bytesFreed += await deleteTempDirectory(job.id);
        } catch (error) {
          console.error(`  Failed to delete temp directory:`, error);
          stats.errors++;
        }

        // Delete job record
        await prisma.dubbingJob.delete({
          where: { id: job.id },
        });

        stats.jobsDeleted++;
        console.log(`  Failed job ${job.id} cleaned up successfully`);
      } catch (error) {
        console.error(`  Error cleaning up failed job ${job.id}:`, error);
        stats.errors++;
      }
    }

    console.log('\n=== Failed Jobs Cleanup Summary ===');
    console.log(`Jobs processed: ${stats.jobsProcessed}`);
    console.log(`Jobs deleted: ${stats.jobsDeleted}`);
    console.log(`Files deleted: ${stats.filesDeleted}`);
    console.log(`Space freed: ${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Errors: ${stats.errors}`);

    return stats;
  } catch (error) {
    console.error('Fatal error during failed jobs cleanup:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('=================================');
    console.log('Video Cleanup Script - MVP');
    console.log('=================================\n');

    // Clean up expired jobs
    const expiredStats = await cleanupExpiredJobs();

    // Clean up old failed jobs
    const failedStats = await cleanupOldFailedJobs();

    // Combined summary
    console.log('\n=== Total Cleanup Summary ===');
    console.log(`Total jobs deleted: ${expiredStats.jobsDeleted + failedStats.jobsDeleted}`);
    console.log(`Total files deleted: ${expiredStats.filesDeleted + failedStats.filesDeleted}`);
    console.log(`Total space freed: ${((expiredStats.bytesFreed + failedStats.bytesFreed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total errors: ${expiredStats.errors + failedStats.errors}`);

    console.log('\nCleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nCleanup failed with error:', error);
    process.exit(1);
  }
}

// Run the script
main();
