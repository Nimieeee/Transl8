import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateInviteCodes(count: number) {
  console.log(`Generating ${count} beta invite codes...`);

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    codes.push(code);
  }

  console.log('\nGenerated Invite Codes:');
  console.log('========================');
  codes.forEach((code, index) => {
    console.log(`${index + 1}. ${code}`);
  });

  return codes;
}

async function listBetaTesters() {
  const testers = await prisma.user.findMany({
    where: { isBetaTester: true },
    select: {
      id: true,
      email: true,
      betaOnboardedAt: true,
      betaInviteCode: true,
      subscriptionTier: true,
      _count: {
        select: {
          projects: true,
          feedback: true,
          supportTickets: true,
        },
      },
    },
    orderBy: { betaOnboardedAt: 'desc' },
  });

  console.log(`\nTotal Beta Testers: ${testers.length}`);
  console.log('========================\n');

  testers.forEach((tester, index) => {
    console.log(`${index + 1}. ${tester.email}`);
    console.log(`   ID: ${tester.id}`);
    console.log(`   Invite Code: ${tester.betaInviteCode}`);
    console.log(`   Onboarded: ${tester.betaOnboardedAt?.toISOString()}`);
    console.log(`   Tier: ${tester.subscriptionTier}`);
    console.log(`   Projects: ${tester._count.projects}`);
    console.log(`   Feedback: ${tester._count.feedback}`);
    console.log(`   Support Tickets: ${tester._count.supportTickets}`);
    console.log('');
  });
}

async function getBetaStats() {
  const [totalTesters, activeTesters, totalProjects, totalFeedback, totalTickets, avgRating] =
    await Promise.all([
      prisma.user.count({ where: { isBetaTester: true } }),
      prisma.user.count({
        where: {
          isBetaTester: true,
          projects: { some: {} },
        },
      }),
      prisma.project.count({
        where: { user: { isBetaTester: true } },
      }),
      prisma.feedback.count(),
      prisma.supportTicket.count(),
      prisma.feedback.aggregate({
        where: { rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

  console.log('\nBeta Program Statistics');
  console.log('========================');
  console.log(`Total Beta Testers: ${totalTesters}`);
  console.log(`Active Testers (created projects): ${activeTesters}`);
  console.log(
    `Activation Rate: ${totalTesters > 0 ? ((activeTesters / totalTesters) * 100).toFixed(1) : 0}%`
  );
  console.log(`Total Projects Created: ${totalProjects}`);
  console.log(
    `Projects per Active User: ${activeTesters > 0 ? (totalProjects / activeTesters).toFixed(1) : 0}`
  );
  console.log(`Total Feedback Submissions: ${totalFeedback}`);
  console.log(`Total Support Tickets: ${totalTickets}`);
  console.log(`Average Feedback Rating: ${avgRating._avg.rating?.toFixed(1) || 'N/A'}`);
}

async function revokeBetaAccess(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isBetaTester: true },
  });

  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }

  if (!user.isBetaTester) {
    console.log(`User is not a beta tester: ${email}`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isBetaTester: false,
      subscriptionTier: 'FREE',
      processingMinutesLimit: 10,
    },
  });

  console.log(`Beta access revoked for: ${email}`);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'generate':
      const count = parseInt(arg) || 10;
      await generateInviteCodes(count);
      break;

    case 'list':
      await listBetaTesters();
      break;

    case 'stats':
      await getBetaStats();
      break;

    case 'revoke':
      if (!arg) {
        console.log('Usage: npm run manage-beta revoke <email>');
        break;
      }
      await revokeBetaAccess(arg);
      break;

    default:
      console.log('Beta Tester Management Tool');
      console.log('===========================\n');
      console.log('Usage:');
      console.log('  npm run manage-beta generate [count]  - Generate invite codes (default: 10)');
      console.log('  npm run manage-beta list               - List all beta testers');
      console.log('  npm run manage-beta stats              - Show beta program statistics');
      console.log('  npm run manage-beta revoke <email>     - Revoke beta access for a user');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
