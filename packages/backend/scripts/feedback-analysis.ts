import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FeedbackAnalysis {
  summary: {
    totalFeedback: number;
    avgRating: number;
    responseRate: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
  featureRequests: Array<{
    feature: string;
    count: number;
    avgPriority: number;
    users: string[];
  }>;
  painPoints: Array<{
    issue: string;
    count: number;
    severity: string;
    users: string[];
  }>;
  positiveHighlights: Array<{
    highlight: string;
    count: number;
    users: string[];
  }>;
  prioritizedImprovements: Array<{
    improvement: string;
    impact: number;
    frequency: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  userSegments: {
    powerUsers: Array<{ email: string; feedback: number; projects: number }>;
    atRiskUsers: Array<{ email: string; lastActive: Date; issues: number }>;
    champions: Array<{ email: string; rating: number; feedback: number }>;
  };
}

async function getFeedbackSummary() {
  const feedback = await prisma.feedback.findMany({
    where: { user: { isBetaTester: true } },
    include: { user: { select: { email: true } } },
  });

  const totalFeedback = feedback.length;
  const totalBetaUsers = await prisma.user.count({ where: { isBetaTester: true } });

  const ratingsOnly = feedback.filter((f) => f.rating !== null);
  const avgRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsOnly.length
      : 0;

  const responseRate = totalBetaUsers > 0 ? (totalFeedback / totalBetaUsers) * 100 : 0;

  // Count by type
  const byType: Record<string, number> = {};
  feedback.forEach((f) => {
    byType[f.type] = (byType[f.type] || 0) + 1;
  });

  // Count by category
  const byCategory: Record<string, number> = {};
  feedback.forEach((f) => {
    if (f.category) {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }
  });

  return {
    totalFeedback,
    avgRating,
    responseRate,
    byType,
    byCategory,
  };
}

async function analyzeFeatureRequests() {
  const featureRequests = await prisma.feedback.findMany({
    where: {
      user: { isBetaTester: true },
      type: 'feature_request',
    },
    include: { user: { select: { email: true } } },
  });

  // Extract and count feature requests from content
  const featureMap = new Map<string, { count: number; users: Set<string>; priorities: number[] }>();

  featureRequests.forEach((f) => {
    // Simple keyword extraction (in production, use NLP)
    const keywords = extractKeywords(f.content);
    keywords.forEach((keyword) => {
      if (!featureMap.has(keyword)) {
        featureMap.set(keyword, { count: 0, users: new Set(), priorities: [] });
      }
      const data = featureMap.get(keyword)!;
      data.count++;
      data.users.add(f.user.email);
      if (f.metadata && typeof f.metadata === 'object' && 'priority' in f.metadata) {
        data.priorities.push((f.metadata as any).priority || 5);
      }
    });
  });

  // Convert to array and sort by frequency
  const features = Array.from(featureMap.entries())
    .map(([feature, data]) => ({
      feature,
      count: data.count,
      avgPriority:
        data.priorities.length > 0
          ? data.priorities.reduce((a, b) => a + b, 0) / data.priorities.length
          : 5,
      users: Array.from(data.users),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return features;
}

async function analyzePainPoints() {
  const bugReports = await prisma.feedback.findMany({
    where: {
      user: { isBetaTester: true },
      type: 'bug_report',
    },
    include: { user: { select: { email: true } } },
  });

  // Extract and categorize pain points
  const painPointMap = new Map<
    string,
    { count: number; users: Set<string>; severities: string[] }
  >();

  bugReports.forEach((f) => {
    const keywords = extractKeywords(f.content);
    keywords.forEach((keyword) => {
      if (!painPointMap.has(keyword)) {
        painPointMap.set(keyword, { count: 0, users: new Set(), severities: [] });
      }
      const data = painPointMap.get(keyword)!;
      data.count++;
      data.users.add(f.user.email);
      if (f.metadata && typeof f.metadata === 'object' && 'severity' in f.metadata) {
        data.severities.push((f.metadata as any).severity || 'medium');
      }
    });
  });

  // Convert to array and sort
  const painPoints = Array.from(painPointMap.entries())
    .map(([issue, data]) => ({
      issue,
      count: data.count,
      severity: getMostCommonSeverity(data.severities),
      users: Array.from(data.users),
    }))
    .sort((a, b) => {
      // Sort by severity first, then count
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff =
        (severityOrder[a.severity as keyof typeof severityOrder] || 2) -
        (severityOrder[b.severity as keyof typeof severityOrder] || 2);
      return severityDiff !== 0 ? severityDiff : b.count - a.count;
    })
    .slice(0, 20);

  return painPoints;
}

async function analyzePositiveHighlights() {
  const positiveFeedback = await prisma.feedback.findMany({
    where: {
      user: { isBetaTester: true },
      OR: [
        { type: 'general', rating: { gte: 8 } },
        { type: 'feature_request', rating: { gte: 8 } },
      ],
    },
    include: { user: { select: { email: true } } },
  });

  // Extract positive highlights
  const highlightMap = new Map<string, { count: number; users: Set<string> }>();

  positiveFeedback.forEach((f) => {
    const keywords = extractKeywords(f.content);
    keywords.forEach((keyword) => {
      if (!highlightMap.has(keyword)) {
        highlightMap.set(keyword, { count: 0, users: new Set() });
      }
      const data = highlightMap.get(keyword)!;
      data.count++;
      data.users.add(f.user.email);
    });
  });

  const highlights = Array.from(highlightMap.entries())
    .map(([highlight, data]) => ({
      highlight,
      count: data.count,
      users: Array.from(data.users),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return highlights;
}

async function prioritizeImprovements(
  featureRequests: Array<{ feature: string; count: number; avgPriority: number }>,
  painPoints: Array<{ issue: string; count: number; severity: string }>
) {
  const improvements: Array<{
    improvement: string;
    impact: number;
    frequency: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }> = [];

  // Add pain points (bugs) with high priority
  painPoints.forEach((p) => {
    const severityWeight = { critical: 10, high: 7, medium: 5, low: 3 };
    const impact = (severityWeight[p.severity as keyof typeof severityWeight] || 5) * p.count;

    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (p.severity === 'critical' || impact > 50) priority = 'critical';
    else if (p.severity === 'high' || impact > 30) priority = 'high';
    else if (impact > 15) priority = 'medium';
    else priority = 'low';

    improvements.push({
      improvement: `Fix: ${p.issue}`,
      impact,
      frequency: p.count,
      priority,
    });
  });

  // Add feature requests
  featureRequests.forEach((f) => {
    const impact = f.count * (11 - f.avgPriority); // Higher priority = lower number

    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (f.count >= 10 && f.avgPriority <= 3) priority = 'critical';
    else if (f.count >= 5 && f.avgPriority <= 5) priority = 'high';
    else if (f.count >= 3) priority = 'medium';
    else priority = 'low';

    improvements.push({
      improvement: `Feature: ${f.feature}`,
      impact,
      frequency: f.count,
      priority,
    });
  });

  // Sort by priority and impact
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  improvements.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    return priorityDiff !== 0 ? priorityDiff : b.impact - a.impact;
  });

  return improvements.slice(0, 30);
}

async function segmentUsers() {
  const betaUsers = await prisma.user.findMany({
    where: { isBetaTester: true },
    include: {
      projects: {
        select: { id: true, createdAt: true, status: true },
      },
      feedback: {
        select: { id: true, rating: true, type: true },
      },
      supportTickets: {
        select: { id: true, category: true },
      },
    },
  });

  // Power users: 5+ projects, 3+ feedback
  const powerUsers = betaUsers
    .filter((u) => u.projects.length >= 5 && u.feedback.length >= 3)
    .map((u) => ({
      email: u.email,
      feedback: u.feedback.length,
      projects: u.projects.length,
    }))
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 20);

  // At-risk users: No activity in 7+ days or multiple issues
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const atRiskUsers = betaUsers
    .filter((u) => {
      const lastProject =
        u.projects.length > 0
          ? new Date(Math.max(...u.projects.map((p) => new Date(p.createdAt).getTime())))
          : new Date(0);
      return lastProject < sevenDaysAgo || u.supportTickets.length >= 3;
    })
    .map((u) => ({
      email: u.email,
      lastActive:
        u.projects.length > 0
          ? new Date(Math.max(...u.projects.map((p) => new Date(p.createdAt).getTime())))
          : new Date(u.betaOnboardedAt || u.createdAt),
      issues: u.supportTickets.length,
    }))
    .sort((a, b) => a.lastActive.getTime() - b.lastActive.getTime())
    .slice(0, 20);

  // Champions: High ratings, active feedback
  const champions = betaUsers
    .filter((u) => {
      const ratings = u.feedback.filter((f) => f.rating !== null).map((f) => f.rating!);
      const avgRating =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      return avgRating >= 8 && u.feedback.length >= 3;
    })
    .map((u) => {
      const ratings = u.feedback.filter((f) => f.rating !== null).map((f) => f.rating!);
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      return {
        email: u.email,
        rating: avgRating,
        feedback: u.feedback.length,
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 20);

  return { powerUsers, atRiskUsers, champions };
}

// Helper functions
function extractKeywords(text: string): string[] {
  // Simple keyword extraction (in production, use proper NLP)
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !commonWords.has(w));

  // Count word frequency
  const wordCount = new Map<string, number>();
  words.forEach((w) => {
    wordCount.set(w, (wordCount.get(w) || 0) + 1);
  });

  // Return top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function getMostCommonSeverity(severities: string[]): string {
  if (severities.length === 0) return 'medium';

  const counts = severities.reduce(
    (acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function generateFeedbackAnalysis(): Promise<FeedbackAnalysis> {
  console.log('Analyzing beta feedback...\n');

  const [summary, featureRequests, painPoints, positiveHighlights, userSegments] =
    await Promise.all([
      getFeedbackSummary(),
      analyzeFeatureRequests(),
      analyzePainPoints(),
      analyzePositiveHighlights(),
      segmentUsers(),
    ]);

  const prioritizedImprovements = await prioritizeImprovements(featureRequests, painPoints);

  return {
    summary,
    featureRequests,
    painPoints,
    positiveHighlights,
    prioritizedImprovements,
    userSegments,
  };
}

function displayAnalysis(analysis: FeedbackAnalysis) {
  console.log('='.repeat(80));
  console.log('BETA FEEDBACK ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log();

  // Summary
  console.log('📊 FEEDBACK SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Feedback:          ${analysis.summary.totalFeedback}`);
  console.log(`Average Rating:          ${analysis.summary.avgRating.toFixed(1)}/10`);
  console.log(`Response Rate:           ${analysis.summary.responseRate.toFixed(1)}%`);
  console.log();
  console.log('By Type:');
  Object.entries(analysis.summary.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();
  console.log('By Category:');
  Object.entries(analysis.summary.byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  console.log();

  // Feature Requests
  console.log('💡 TOP FEATURE REQUESTS');
  console.log('-'.repeat(80));
  analysis.featureRequests.slice(0, 10).forEach((f, i) => {
    console.log(`${i + 1}. ${f.feature}`);
    console.log(`   Requested by: ${f.count} users (Priority: ${f.avgPriority.toFixed(1)}/10)`);
    console.log(`   Users: ${f.users.slice(0, 3).join(', ')}${f.users.length > 3 ? '...' : ''}`);
    console.log();
  });

  // Pain Points
  console.log('⚠️  TOP PAIN POINTS');
  console.log('-'.repeat(80));
  analysis.painPoints.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. ${p.issue} [${p.severity.toUpperCase()}]`);
    console.log(`   Reported by: ${p.count} users`);
    console.log(`   Users: ${p.users.slice(0, 3).join(', ')}${p.users.length > 3 ? '...' : ''}`);
    console.log();
  });

  // Positive Highlights
  console.log('✨ POSITIVE HIGHLIGHTS');
  console.log('-'.repeat(80));
  analysis.positiveHighlights.slice(0, 10).forEach((h, i) => {
    console.log(`${i + 1}. ${h.highlight}`);
    console.log(`   Mentioned by: ${h.count} users`);
    console.log();
  });

  // Prioritized Improvements
  console.log('🎯 PRIORITIZED IMPROVEMENTS');
  console.log('-'.repeat(80));
  const byCritical = analysis.prioritizedImprovements.filter((i) => i.priority === 'critical');
  const byHigh = analysis.prioritizedImprovements.filter((i) => i.priority === 'high');
  const byMedium = analysis.prioritizedImprovements.filter((i) => i.priority === 'medium');

  if (byCritical.length > 0) {
    console.log('\n🔴 CRITICAL:');
    byCritical.forEach((imp, i) => {
      console.log(
        `  ${i + 1}. ${imp.improvement} (Impact: ${imp.impact.toFixed(0)}, Frequency: ${imp.frequency})`
      );
    });
  }

  if (byHigh.length > 0) {
    console.log('\n🟠 HIGH:');
    byHigh.slice(0, 5).forEach((imp, i) => {
      console.log(
        `  ${i + 1}. ${imp.improvement} (Impact: ${imp.impact.toFixed(0)}, Frequency: ${imp.frequency})`
      );
    });
  }

  if (byMedium.length > 0) {
    console.log('\n🟡 MEDIUM:');
    byMedium.slice(0, 5).forEach((imp, i) => {
      console.log(
        `  ${i + 1}. ${imp.improvement} (Impact: ${imp.impact.toFixed(0)}, Frequency: ${imp.frequency})`
      );
    });
  }
  console.log();

  // User Segments
  console.log('👥 USER SEGMENTS');
  console.log('-'.repeat(80));

  console.log('\n🌟 Power Users (Top 10):');
  analysis.userSegments.powerUsers.slice(0, 10).forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} - ${u.projects} projects, ${u.feedback} feedback`);
  });

  console.log('\n⚠️  At-Risk Users (Top 10):');
  analysis.userSegments.atRiskUsers.slice(0, 10).forEach((u, i) => {
    console.log(
      `  ${i + 1}. ${u.email} - Last active: ${u.lastActive.toISOString().split('T')[0]}, Issues: ${u.issues}`
    );
  });

  console.log('\n🏆 Champions (Top 10):');
  analysis.userSegments.champions.slice(0, 10).forEach((u, i) => {
    console.log(
      `  ${i + 1}. ${u.email} - Rating: ${u.rating.toFixed(1)}/10, ${u.feedback} feedback`
    );
  });

  console.log();
  console.log('='.repeat(80));
}

async function exportAnalysis(analysis: FeedbackAnalysis, filename: string) {
  const fs = require('fs');
  const path = require('path');

  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✅ Analysis exported to: ${outputPath}`);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    const analysis = await generateFeedbackAnalysis();

    switch (command) {
      case 'display':
        displayAnalysis(analysis);
        break;

      case 'export':
        const filename = arg || `feedback-analysis-${new Date().toISOString().split('T')[0]}.json`;
        displayAnalysis(analysis);
        await exportAnalysis(analysis, filename);
        break;

      case 'json':
        console.log(JSON.stringify(analysis, null, 2));
        break;

      case 'priorities':
        console.log('🎯 PRIORITIZED IMPROVEMENTS\n');
        analysis.prioritizedImprovements.forEach((imp, i) => {
          const emoji =
            imp.priority === 'critical'
              ? '🔴'
              : imp.priority === 'high'
                ? '🟠'
                : imp.priority === 'medium'
                  ? '🟡'
                  : '🟢';
          console.log(`${emoji} ${i + 1}. [${imp.priority.toUpperCase()}] ${imp.improvement}`);
          console.log(`   Impact: ${imp.impact.toFixed(0)}, Frequency: ${imp.frequency}\n`);
        });
        break;

      case 'champions':
        console.log('🏆 BETA CHAMPIONS\n');
        analysis.userSegments.champions.forEach((u, i) => {
          console.log(`${i + 1}. ${u.email}`);
          console.log(`   Rating: ${u.rating.toFixed(1)}/10, Feedback: ${u.feedback}\n`);
        });
        break;

      case 'at-risk':
        console.log('⚠️  AT-RISK USERS\n');
        analysis.userSegments.atRiskUsers.forEach((u, i) => {
          console.log(`${i + 1}. ${u.email}`);
          console.log(
            `   Last Active: ${u.lastActive.toISOString().split('T')[0]}, Issues: ${u.issues}\n`
          );
        });
        break;

      default:
        displayAnalysis(analysis);
        console.log('\nUsage:');
        console.log('  npm run feedback-analysis display          - Display full analysis');
        console.log('  npm run feedback-analysis export [file]    - Export analysis to JSON');
        console.log('  npm run feedback-analysis json             - Output raw JSON');
        console.log('  npm run feedback-analysis priorities       - Show prioritized improvements');
        console.log('  npm run feedback-analysis champions        - Show beta champions');
        console.log('  npm run feedback-analysis at-risk          - Show at-risk users');
    }
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
