import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for MVP prototype...');

  // Clear existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.dubbingJob.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create test users
  console.log('👤 Creating users...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: passwordHash,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: passwordHash,
    },
  });

  console.log(`✅ Created ${2} users`);

  // Create sample dubbing jobs
  console.log('🎬 Creating dubbing jobs...');

  await prisma.dubbingJob.create({
    data: {
      userId: testUser.id,
      status: 'completed',
      progress: 100,
      originalFile: '/uploads/test-video-1.mp4',
      outputFile: '/outputs/test-video-1-dubbed.mp4',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      completedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 82800000), // 24 hours from completion
    },
  });

  await prisma.dubbingJob.create({
    data: {
      userId: testUser.id,
      status: 'processing',
      progress: 45,
      originalFile: '/uploads/test-video-2.mp4',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    },
  });

  await prisma.dubbingJob.create({
    data: {
      userId: demoUser.id,
      status: 'pending',
      progress: 0,
      originalFile: '/uploads/demo-video-1.mp4',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    },
  });

  await prisma.dubbingJob.create({
    data: {
      userId: demoUser.id,
      status: 'failed',
      progress: 30,
      originalFile: '/uploads/demo-video-2.mp4',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      error: 'Video format not supported',
    },
  });

  console.log(`✅ Created ${4} dubbing jobs`);

  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
