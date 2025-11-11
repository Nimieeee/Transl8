import { User, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface UserFixture {
  email: string;
  password: string;
  passwordHash: string;
  subscriptionTier: SubscriptionTier;
  processingMinutesLimit: number;
  voiceCloneSlots: number;
}

export const testUsers: Record<string, UserFixture> = {
  free: {
    email: 'free@test.com',
    password: 'Password123!',
    passwordHash: '', // Will be set below
    subscriptionTier: 'FREE',
    processingMinutesLimit: 10,
    voiceCloneSlots: 0,
  },
  creator: {
    email: 'creator@test.com',
    password: 'Password123!',
    passwordHash: '',
    subscriptionTier: 'CREATOR',
    processingMinutesLimit: 120,
    voiceCloneSlots: 3,
  },
  pro: {
    email: 'pro@test.com',
    password: 'Password123!',
    passwordHash: '',
    subscriptionTier: 'PRO',
    processingMinutesLimit: -1, // Unlimited
    voiceCloneSlots: 10,
  },
};

// Pre-hash passwords
(async () => {
  for (const key in testUsers) {
    testUsers[key].passwordHash = await bcrypt.hash(testUsers[key].password, 12);
  }
})();

export async function createTestUser(
  prisma: any,
  userType: keyof typeof testUsers = 'free'
): Promise<User> {
  const fixture = testUsers[userType];
  const passwordHash = await bcrypt.hash(fixture.password, 12);

  return prisma.user.create({
    data: {
      email: fixture.email,
      passwordHash,
      subscriptionTier: fixture.subscriptionTier,
      processingMinutesUsed: 0,
      processingMinutesLimit: fixture.processingMinutesLimit,
      voiceCloneSlots: fixture.voiceCloneSlots,
    },
  });
}
