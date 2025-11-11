/**
 * Adaptation Quality Metrics Service
 * 
 * Tracks and analyzes adaptation engine performance including success rates,
 * retry attempts, and validation failure reasons.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { ContextMap, SegmentStatus } from '../../../shared/src/types';

export interface AdaptationMetrics {
  languagePair: string;
  totalSegments: number;
  successfulSegments: number;
  failedSegments: number;
  successRate: number;
  averageAttempts: number;
  validationFailureReasons: Record<string, number>;
  processingTimeMs: number;
  timestamp: Date;
}

export interface AdaptationDashboardData {
  overallMetrics: {
    totalProjects: number;
    totalSegments: number;
    overallSuccessRate: number;
    averageAttempts: number;
  };
  byLanguagePair: AdaptationMetrics[];
  recentFailures: Array<{
    projectId: string;
    segmentId: number;
    text: string;
    reason: string;
    attempts: number;
    timestamp: Date;
  }>;
  validationFailureBreakdown: Record<string, number>;
  trendsOverTime: Array<{
    date: string;
    successRate: number;
    averageAttempts: number;
  }>;
}

export class AdaptationMetricsService {
  /**
   * Record adaptation metrics for a project
   */
  async recordProjectMetrics(projectId: string, contextMap: ContextMap): Promise<void> {
    const languagePair = `${contextMap.source_language}-${contextMap.target_language}`;
    
    const totalSegments = contextMap.segments.length;
    const successfulSegments = contextMap.segments.filter(s => s.status === 'success').length;
    const failedSegments = contextMap.segments.filter(s => s.status?.startsWith('failed_')).length;
    
    const totalAttempts = contextMap.segments.reduce((sum, s) => sum + (s.attempts || 0), 0);
    const averageAttempts = totalSegments > 0 ? totalAttempts / totalSegments : 0;
    
    const successRate = totalSegments > 0 ? (successfulSegments / totalSegments) * 100 : 0;
    
    // Collect validation failure reasons
    const validationFailureReasons: Record<string, number> = {};
    contextMap.segments.forEach(segment => {
      if (segment.status?.startsWith('failed_') && segment.validation_feedback) {
        const reason = segment.validation_feedback;
        validationFailureReasons[reason] = (validationFailureReasons[reason] || 0) + 1;
      }
    });

    // Store metrics in database
    await prisma.adaptationMetrics.create({
      data: {
        projectId,
        languagePair,
        totalSegments,
        successfulSegments,
        failedSegments,
        successRate,
        averageAttempts,
        validationFailureReasons: validationFailureReasons as any,
      },
    });

    logger.info(`Recorded adaptation metrics for project ${projectId}: ${successRate.toFixed(1)}% success rate`);
  }

  /**
   * Get metrics for a specific language pair
   */
  async getLanguagePairMetrics(
    sourceLanguage: string,
    targetLanguage: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AdaptationMetrics | null> {
    const languagePair = `${sourceLanguage}-${targetLanguage}`;
    
    const where: any = { languagePair };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const metrics = await prisma.adaptationMetrics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (metrics.length === 0) {
      return null;
    }

    // Aggregate metrics
    const totalSegments = metrics.reduce((sum, m) => sum + m.totalSegments, 0);
    const successfulSegments = metrics.reduce((sum, m) => sum + m.successfulSegments, 0);
    const failedSegments = metrics.reduce((sum, m) => sum + m.failedSegments, 0);
    const totalAttempts = metrics.reduce((sum, m) => sum + m.averageAttempts * m.totalSegments, 0);
    
    const successRate = totalSegments > 0 ? (successfulSegments / totalSegments) * 100 : 0;
    const averageAttempts = totalSegments > 0 ? totalAttempts / totalSegments : 0;

    // Merge validation failure reasons
    const validationFailureReasons: Record<string, number> = {};
    metrics.forEach(m => {
      const reasons = m.validationFailureReasons as Record<string, number>;
      if (reasons) {
        Object.entries(reasons).forEach(([reason, count]) => {
          validationFailureReasons[reason] = (validationFailureReasons[reason] || 0) + count;
        });
      }
    });

    return {
      languagePair,
      totalSegments,
      successfulSegments,
      failedSegments,
      successRate,
      averageAttempts,
      validationFailureReasons,
      processingTimeMs: 0, // Not tracked in aggregation
      timestamp: new Date(),
    };
  }

  /**
   * Get dashboard data with comprehensive metrics
   */
  async getDashboardData(days: number = 30): Promise<AdaptationDashboardData> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all metrics within date range
    const allMetrics = await prisma.adaptationMetrics.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall metrics
    const totalProjects = allMetrics.length;
    const totalSegments = allMetrics.reduce((sum, m) => sum + m.totalSegments, 0);
    const successfulSegments = allMetrics.reduce((sum, m) => sum + m.successfulSegments, 0);
    const totalAttempts = allMetrics.reduce((sum, m) => sum + m.averageAttempts * m.totalSegments, 0);
    
    const overallSuccessRate = totalSegments > 0 ? (successfulSegments / totalSegments) * 100 : 0;
    const averageAttempts = totalSegments > 0 ? totalAttempts / totalSegments : 0;

    // Group by language pair
    const byLanguagePairMap = new Map<string, AdaptationMetrics>();
    allMetrics.forEach(metric => {
      const existing = byLanguagePairMap.get(metric.languagePair);
      if (existing) {
        existing.totalSegments += metric.totalSegments;
        existing.successfulSegments += metric.successfulSegments;
        existing.failedSegments += metric.failedSegments;
        existing.successRate = existing.totalSegments > 0 
          ? (existing.successfulSegments / existing.totalSegments) * 100 
          : 0;
        
        const totalAttempts = existing.averageAttempts * (existing.totalSegments - metric.totalSegments) +
                             metric.averageAttempts * metric.totalSegments;
        existing.averageAttempts = totalAttempts / existing.totalSegments;

        // Merge validation failure reasons
        const reasons = metric.validationFailureReasons as Record<string, number>;
        if (reasons) {
          Object.entries(reasons).forEach(([reason, count]) => {
            existing.validationFailureReasons[reason] = 
              (existing.validationFailureReasons[reason] || 0) + count;
          });
        }
      } else {
        byLanguagePairMap.set(metric.languagePair, {
          languagePair: metric.languagePair,
          totalSegments: metric.totalSegments,
          successfulSegments: metric.successfulSegments,
          failedSegments: metric.failedSegments,
          successRate: metric.successRate,
          averageAttempts: metric.averageAttempts,
          validationFailureReasons: { ...(metric.validationFailureReasons as Record<string, number> || {}) },
          processingTimeMs: 0,
          timestamp: metric.createdAt,
        });
      }
    });

    // Get recent failures from Context Maps
    const recentProjects = await prisma.contextMap.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const recentFailures: AdaptationDashboardData['recentFailures'] = [];
    recentProjects.forEach(project => {
      const contextMap = project.content as ContextMap;
      contextMap.segments.forEach(segment => {
        if (segment.status?.startsWith('failed_')) {
          recentFailures.push({
            projectId: project.projectId,
            segmentId: segment.id,
            text: segment.text,
            reason: segment.validation_feedback || 'Unknown',
            attempts: segment.attempts || 0,
            timestamp: new Date(contextMap.updated_at),
          });
        }
      });
    });

    // Sort by timestamp and limit
    recentFailures.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedFailures = recentFailures.slice(0, 50);

    // Aggregate validation failure reasons
    const validationFailureBreakdown: Record<string, number> = {};
    allMetrics.forEach(metric => {
      const reasons = metric.validationFailureReasons as Record<string, number>;
      if (reasons) {
        Object.entries(reasons).forEach(([reason, count]) => {
          validationFailureBreakdown[reason] = (validationFailureBreakdown[reason] || 0) + count;
        });
      }
    });

    // Calculate trends over time (daily aggregation)
    const trendsMap = new Map<string, { successCount: number; totalCount: number; attemptSum: number }>();
    allMetrics.forEach(metric => {
      const dateKey = metric.createdAt.toISOString().split('T')[0];
      const existing = trendsMap.get(dateKey);
      if (existing) {
        existing.successCount += metric.successfulSegments;
        existing.totalCount += metric.totalSegments;
        existing.attemptSum += metric.averageAttempts * metric.totalSegments;
      } else {
        trendsMap.set(dateKey, {
          successCount: metric.successfulSegments,
          totalCount: metric.totalSegments,
          attemptSum: metric.averageAttempts * metric.totalSegments,
        });
      }
    });

    const trendsOverTime = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        successRate: data.totalCount > 0 ? (data.successCount / data.totalCount) * 100 : 0,
        averageAttempts: data.totalCount > 0 ? data.attemptSum / data.totalCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      overallMetrics: {
        totalProjects,
        totalSegments,
        overallSuccessRate,
        averageAttempts,
      },
      byLanguagePair: Array.from(byLanguagePairMap.values()),
      recentFailures: limitedFailures,
      validationFailureBreakdown,
      trendsOverTime,
    };
  }

  /**
   * Get metrics for a specific project
   */
  async getProjectMetrics(projectId: string): Promise<AdaptationMetrics | null> {
    const metric = await prisma.adaptationMetrics.findUnique({
      where: { projectId },
    });

    if (!metric) {
      return null;
    }

    return {
      languagePair: metric.languagePair,
      totalSegments: metric.totalSegments,
      successfulSegments: metric.successfulSegments,
      failedSegments: metric.failedSegments,
      successRate: metric.successRate,
      averageAttempts: metric.averageAttempts,
      validationFailureReasons: metric.validationFailureReasons as Record<string, number>,
      processingTimeMs: 0,
      timestamp: metric.createdAt,
    };
  }

  /**
   * Track validation failure in real-time
   */
  async trackValidationFailure(
    projectId: string,
    segmentId: number,
    reason: string,
    attempts: number
  ): Promise<void> {
    logger.warn(`Validation failure in project ${projectId}, segment ${segmentId}: ${reason} (attempt ${attempts})`);
    
    // This could be used for real-time alerting
    // For now, just log it
  }

  /**
   * Get alert-worthy metrics (low success rates)
   */
  async getAlerts(threshold: number = 70): Promise<Array<{
    languagePair: string;
    successRate: number;
    totalSegments: number;
    message: string;
  }>> {
    const dashboardData = await this.getDashboardData(7); // Last 7 days
    
    const alerts: Array<{
      languagePair: string;
      successRate: number;
      totalSegments: number;
      message: string;
    }> = [];

    dashboardData.byLanguagePair.forEach(metrics => {
      if (metrics.successRate < threshold && metrics.totalSegments >= 10) {
        alerts.push({
          languagePair: metrics.languagePair,
          successRate: metrics.successRate,
          totalSegments: metrics.totalSegments,
          message: `Low success rate (${metrics.successRate.toFixed(1)}%) for ${metrics.languagePair}`,
        });
      }
    });

    return alerts;
  }
}

// Export singleton instance
export const adaptationMetricsService = new AdaptationMetricsService();
