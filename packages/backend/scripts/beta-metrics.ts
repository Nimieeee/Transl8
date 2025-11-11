import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BetaMetrics {
  activation: {
    totalInvited: number;
    totalActivated: number;
    activationRate: number;
    avgTimeToActivation: number;
  };
  featureAdoption: {
    projectsCreated: number;
    usersWithProjects: number;
    avgProjectsPerUser: number;
    voiceClonesCreated: number;
    usersWithVoiceClones: number;
    glossariesCreated: number;
  };
  projectCompletion: {
    totalProjects: number;
    completedProjects: number;
    completionRate: number;
    avgCompletionTime: number;
    dropOffPoints: {
      upload: number;
      transcription: number;
      translation: number;
      voiceGeneration: number;
      lipSync: number;
    };
  };
  qualitySatisfaction: {
    avgFeedbackRating: number;
    totalFeedback: number;
    ratingDistribution: Record<number, number>;
    qualityByFeature: {
      transcription: number;
      translation: number;
      voiceQuality: number;
      lipSync: number;
    };
  };
  support: {
    totalTickets: number;
    openTickets: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    commonIssues: Array<{ category: string; count: number }>;
  };
  usagePatterns: {
    byTier: Record<
      string,
      {
        users: number;
        projects: number;
        avgMinutesProcessed: number;
      }
    >;
    byLanguagePair: Array<{
      source: string;
      target: string;
      count: number;
    }>;
    peakUsageHours: Array<{ hour: number; count: number }>;
  };
}

async function getActivationMetrics() {
  const betaUsers = await prisma.user.findMany({
    where: { isBetaTester: true },
    select: {
      betaOnboardedAt: true,
      createdAt: true,
    },
  });

  const totalActivated = betaUsers.filter((u) => u.betaOnboardedAt).length;

  // Calculate average time to activation
  const activationTimes = betaUsers
    .filter((u) => u.betaOnboardedAt)
    .map((u) => {
      const created = new Date(u.createdAt).getTime();
      const activated = new Date(u.betaOnboardedAt!).getTime();
      return (activated - created) / (1000 * 60 * 60); // hours
    });

  const avgTimeToActivation =
    activationTimes.length > 0
      ? activationTimes.reduce((a, b) => a + b, 0) / activationTimes.length
      : 0;

  return {
    totalInvited: betaUsers.length,
    totalActivated,
    activationRate: betaUsers.length > 0 ? (totalActivated / betaUsers.length) * 100 : 0,
    avgTimeToActivation,
  };
}

async function getFeatureAdoptionMetrics() {
  const betaUserIds = await prisma.user.findMany({
    where: { isBetaTester: true },
    select: { id: true },
  });

  const userIds = betaUserIds.map((u) => u.id);

  const [
    projectsCreated,
    usersWithProjects,
    voiceClonesCreated,
    usersWithVoiceClones,
    glossariesCreated,
  ] = await Promise.all([
    prisma.project.count({ where: { userId: { in: userIds } } }),
    prisma.user.count({
      where: {
        id: { in: userIds },
        projects: { some: {} },
      },
    }),
    prisma.voiceClone.count({ where: { userId: { in: userIds } } }),
    prisma.user.count({
      where: {
        id: { in: userIds },
        voiceClones: { some: {} },
      },
    }),
    prisma.glossary.count({ where: { userId: { in: userIds } } }),
  ]);

  return {
    projectsCreated,
    usersWithProjects,
    avgProjectsPerUser: usersWithProjects > 0 ? projectsCreated / usersWithProjects : 0,
    voiceClonesCreated,
    usersWithVoiceClones,
    glossariesCreated,
  };
}

async function getProjectCompletionMetrics() {
  const betaUserIds = await prisma.user.findMany({
    where: { isBetaTester: true },
    select: { id: true },
  });

  const userIds = betaUserIds.map((u) => u.id);

  const projects = await prisma.project.findMany({
    where: { userId: { in: userIds } },
    select: {
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;

  // Calculate average completion time for completed projects
  const completionTimes = projects
    .filter((p) => p.status === 'COMPLETED')
    .map((p) => {
      const created = new Date(p.createdAt).getTime();
      const completed = new Date(p.updatedAt).getTime();
      return (completed - created) / (1000 * 60); // minutes
    });

  const avgCompletionTime =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  // Count drop-off points by status
  const dropOffPoints = {
    upload: projects.filter((p) => p.status === 'CREATED').length,
    transcription: projects.filter((p) => p.status === 'TRANSCRIBING').length,
    translation: projects.filter((p) => p.status === 'TRANSLATING').length,
    voiceGeneration: projects.filter((p) => p.status === 'GENERATING_VOICE').length,
    lipSync: projects.filter((p) => p.status === 'LIP_SYNCING').length,
  };

  return {
    totalProjects,
    completedProjects,
    completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
    avgCompletionTime,
    dropOffPoints,
  };
}

async function getQualitySatisfactionMetrics() {
  const feedback = await prisma.feedback.findMany({
    where: {
      user: { isBetaTester: true },
      rating: { not: null },
    },
    select: {
      rating: true,
      category: true,
    },
  });

  const totalFeedback = feedback.length;
  const avgFeedbackRating =
    totalFeedback > 0 ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedback : 0;

  // Rating distribution
  const ratingDistribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) {
    ratingDistribution[i] = feedback.filter((f) => f.rating === i).length;
  }

  // Quality by feature (based on feedback category)
  const categoryRatings: Record<string, number[]> = {};
  feedback.forEach((f) => {
    if (f.category && f.rating) {
      if (!categoryRatings[f.category]) {
        categoryRatings[f.category] = [];
      }
      categoryRatings[f.category].push(f.rating);
    }
  });

  const qualityByFeature = {
    transcription: categoryRatings['transcription']
      ? categoryRatings['transcription'].reduce((a, b) => a + b, 0) /
        categoryRatings['transcription'].length
      : 0,
    translation: categoryRatings['translation']
      ? categoryRatings['translation'].reduce((a, b) => a + b, 0) /
        categoryRatings['translation'].length
      : 0,
    voiceQuality: categoryRatings['voice_quality']
      ? categoryRatings['voice_quality'].reduce((a, b) => a + b, 0) /
        categoryRatings['voice_quality'].length
      : 0,
    lipSync: categoryRatings['lip_sync']
      ? categoryRatings['lip_sync'].reduce((a, b) => a + b, 0) / categoryRatings['lip_sync'].length
      : 0,
  };

  return {
    avgFeedbackRating,
    totalFeedback,
    ratingDistribution,
    qualityByFeature,
  };
}

async function getSupportMetrics() {
  const tickets = await prisma.supportTicket.findMany({
    where: { user: { isBetaTester: true } },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 2,
      },
    },
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
  ).length;

  // Calculate average response time (time to first response)
  const responseTimes = tickets
    .filter((t) => t.messages.length > 1)
    .map((t) => {
      const created = new Date(t.createdAt).getTime();
      const firstResponse = new Date(t.messages[1].createdAt).getTime();
      return (firstResponse - created) / (1000 * 60 * 60); // hours
    });

  const avgResponseTime =
    responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

  // Calculate average resolution time
  const resolutionTimes = tickets
    .filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED')
    .map((t) => {
      const created = new Date(t.createdAt).getTime();
      const resolved = new Date(t.updatedAt).getTime();
      return (resolved - created) / (1000 * 60 * 60); // hours
    });

  const avgResolutionTime =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

  // Common issues by category
  const categoryCount: Record<string, number> = {};
  tickets.forEach((t) => {
    if (t.category) {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    }
  });

  const commonIssues = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTickets,
    openTickets,
    avgResponseTime,
    avgResolutionTime,
    commonIssues,
  };
}

async function getUsagePatterns() {
  const betaUsers = await prisma.user.findMany({
    where: { isBetaTester: true },
    include: {
      projects: {
        select: {
          sourceLanguage: true,
          targetLanguage: true,
          createdAt: true,
        },
      },
    },
  });

  // Usage by tier
  const byTier: Record<string, { users: number; projects: number; avgMinutesProcessed: number }> =
    {};

  betaUsers.forEach((user) => {
    const tier = user.subscriptionTier;
    if (!byTier[tier]) {
      byTier[tier] = { users: 0, projects: 0, avgMinutesProcessed: 0 };
    }
    byTier[tier].users++;
    byTier[tier].projects += user.projects.length;
  });

  // Usage by language pair
  const languagePairCount: Record<string, number> = {};
  betaUsers.forEach((user) => {
    user.projects.forEach((project) => {
      const pair = `${project.sourceLanguage}-${project.targetLanguage}`;
      languagePairCount[pair] = (languagePairCount[pair] || 0) + 1;
    });
  });

  const byLanguagePair = Object.entries(languagePairCount)
    .map(([pair, count]) => {
      const [source, target] = pair.split('-');
      return { source, target, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Peak usage hours
  const hourCount: Record<number, number> = {};
  betaUsers.forEach((user) => {
    user.projects.forEach((project) => {
      const hour = new Date(project.createdAt).getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
  });

  const peakUsageHours = Object.entries(hourCount)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    byTier,
    byLanguagePair,
    peakUsageHours,
  };
}

async function generateBetaMetrics(): Promise<BetaMetrics> {
  console.log('Generating beta testing metrics...\n');

  const [
    activation,
    featureAdoption,
    projectCompletion,
    qualitySatisfaction,
    support,
    usagePatterns,
  ] = await Promise.all([
    getActivationMetrics(),
    getFeatureAdoptionMetrics(),
    getProjectCompletionMetrics(),
    getQualitySatisfactionMetrics(),
    getSupportMetrics(),
    getUsagePatterns(),
  ]);

  return {
    activation,
    featureAdoption,
    projectCompletion,
    qualitySatisfaction,
    support,
    usagePatterns,
  };
}

function displayMetrics(metrics: BetaMetrics) {
  console.log('='.repeat(80));
  console.log('BETA TESTING METRICS REPORT');
  console.log('='.repeat(80));
  console.log();

  // Activation Metrics
  console.log('📊 ACTIVATION METRICS');
  console.log('-'.repeat(80));
  console.log(`Total Invited:           ${metrics.activation.totalInvited}`);
  console.log(`Total Activated:         ${metrics.activation.totalActivated}`);
  console.log(`Activation Rate:         ${metrics.activation.activationRate.toFixed(1)}%`);
  console.log(
    `Avg Time to Activation:  ${metrics.activation.avgTimeToActivation.toFixed(1)} hours`
  );
  console.log();

  // Feature Adoption
  console.log('🎯 FEATURE ADOPTION');
  console.log('-'.repeat(80));
  console.log(`Projects Created:        ${metrics.featureAdoption.projectsCreated}`);
  console.log(`Users with Projects:     ${metrics.featureAdoption.usersWithProjects}`);
  console.log(`Avg Projects/User:       ${metrics.featureAdoption.avgProjectsPerUser.toFixed(1)}`);
  console.log(`Voice Clones Created:    ${metrics.featureAdoption.voiceClonesCreated}`);
  console.log(`Users with Voice Clones: ${metrics.featureAdoption.usersWithVoiceClones}`);
  console.log(`Glossaries Created:      ${metrics.featureAdoption.glossariesCreated}`);
  console.log();

  // Project Completion
  console.log('✅ PROJECT COMPLETION');
  console.log('-'.repeat(80));
  console.log(`Total Projects:          ${metrics.projectCompletion.totalProjects}`);
  console.log(`Completed Projects:      ${metrics.projectCompletion.completedProjects}`);
  console.log(`Completion Rate:         ${metrics.projectCompletion.completionRate.toFixed(1)}%`);
  console.log(
    `Avg Completion Time:     ${metrics.projectCompletion.avgCompletionTime.toFixed(1)} minutes`
  );
  console.log();
  console.log('Drop-off Points:');
  console.log(`  Upload:                ${metrics.projectCompletion.dropOffPoints.upload}`);
  console.log(`  Transcription:         ${metrics.projectCompletion.dropOffPoints.transcription}`);
  console.log(`  Translation:           ${metrics.projectCompletion.dropOffPoints.translation}`);
  console.log(
    `  Voice Generation:      ${metrics.projectCompletion.dropOffPoints.voiceGeneration}`
  );
  console.log(`  Lip Sync:              ${metrics.projectCompletion.dropOffPoints.lipSync}`);
  console.log();

  // Quality Satisfaction
  console.log('⭐ QUALITY & SATISFACTION');
  console.log('-'.repeat(80));
  console.log(
    `Avg Feedback Rating:     ${metrics.qualitySatisfaction.avgFeedbackRating.toFixed(1)}/10`
  );
  console.log(`Total Feedback:          ${metrics.qualitySatisfaction.totalFeedback}`);
  console.log();
  console.log('Quality by Feature:');
  console.log(
    `  Transcription:         ${metrics.qualitySatisfaction.qualityByFeature.transcription.toFixed(1)}/10`
  );
  console.log(
    `  Translation:           ${metrics.qualitySatisfaction.qualityByFeature.translation.toFixed(1)}/10`
  );
  console.log(
    `  Voice Quality:         ${metrics.qualitySatisfaction.qualityByFeature.voiceQuality.toFixed(1)}/10`
  );
  console.log(
    `  Lip Sync:              ${metrics.qualitySatisfaction.qualityByFeature.lipSync.toFixed(1)}/10`
  );
  console.log();

  // Support Metrics
  console.log('🎫 SUPPORT METRICS');
  console.log('-'.repeat(80));
  console.log(`Total Tickets:           ${metrics.support.totalTickets}`);
  console.log(`Open Tickets:            ${metrics.support.openTickets}`);
  console.log(`Avg Response Time:       ${metrics.support.avgResponseTime.toFixed(1)} hours`);
  console.log(`Avg Resolution Time:     ${metrics.support.avgResolutionTime.toFixed(1)} hours`);
  console.log();
  console.log('Common Issues:');
  metrics.support.commonIssues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.category}: ${issue.count}`);
  });
  console.log();

  // Usage Patterns
  console.log('📈 USAGE PATTERNS');
  console.log('-'.repeat(80));
  console.log('By Subscription Tier:');
  Object.entries(metrics.usagePatterns.byTier).forEach(([tier, data]) => {
    console.log(`  ${tier}:`);
    console.log(`    Users:    ${data.users}`);
    console.log(`    Projects: ${data.projects}`);
  });
  console.log();
  console.log('Top Language Pairs:');
  metrics.usagePatterns.byLanguagePair.forEach((pair, i) => {
    console.log(`  ${i + 1}. ${pair.source} → ${pair.target}: ${pair.count}`);
  });
  console.log();
  console.log('Peak Usage Hours (UTC):');
  metrics.usagePatterns.peakUsageHours.forEach((hour, i) => {
    console.log(`  ${i + 1}. ${hour.hour}:00 - ${hour.count} projects`);
  });
  console.log();
  console.log('='.repeat(80));
}

async function exportMetricsToJSON(metrics: BetaMetrics, filename: string) {
  const fs = require('fs');
  const path = require('path');

  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`\n✅ Metrics exported to: ${outputPath}`);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    const metrics = await generateBetaMetrics();

    switch (command) {
      case 'display':
        displayMetrics(metrics);
        break;

      case 'export':
        const filename = arg || `beta-metrics-${new Date().toISOString().split('T')[0]}.json`;
        displayMetrics(metrics);
        await exportMetricsToJSON(metrics, filename);
        break;

      case 'json':
        console.log(JSON.stringify(metrics, null, 2));
        break;

      default:
        displayMetrics(metrics);
        console.log('\nUsage:');
        console.log('  npm run beta-metrics display          - Display metrics in console');
        console.log('  npm run beta-metrics export [file]    - Export metrics to JSON file');
        console.log('  npm run beta-metrics json             - Output raw JSON');
    }
  } catch (error) {
    console.error('Error generating metrics:', error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
