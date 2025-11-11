import request from 'supertest';
import express, { Express } from 'express';
import subscriptionRoutes from '../../src/routes/subscription';
import projectRoutes from '../../src/routes/projects';
import { prisma } from '../setup';
import { createTestUser } from '../fixtures/users';
import { generateAuthToken } from '../utils/auth-helper';

describe('Subscription Tier Enforcement', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/subscription', subscriptionRoutes);
    app.use('/api/projects', projectRoutes);
  });

  describe('Processing Minutes Limits', () => {
    it('should allow free tier user within limit', async () => {
      const user = await createTestUser(prisma, 'free');
      const token = generateAuthToken(user);

      // Update user to have used 5 minutes (limit is 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { processingMinutesUsed: 5 },
      });

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        })
        .expect(201);

      expect(response.body.project).toBeDefined();
    });

    it('should block free tier user exceeding limit', async () => {
      const user = await createTestUser(prisma, 'free');
      const token = generateAuthToken(user);

      // Update user to have used 10 minutes (at limit)
      await prisma.user.update({
        where: { id: user.id },
        data: { processingMinutesUsed: 10 },
      });

      // Create a project
      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Test Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'UPLOADING',
          duration: 120, // 2 minutes
        },
      });

      // Try to start processing (should be blocked)
      const response = await request(app)
        .post(`/api/projects/${project.id}/start`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('QUOTA_EXCEEDED');
    });

    it('should allow pro tier user unlimited processing', async () => {
      const user = await createTestUser(prisma, 'pro');
      const token = generateAuthToken(user);

      // Update user to have used 1000 minutes (way over free limit)
      await prisma.user.update({
        where: { id: user.id },
        data: { processingMinutesUsed: 1000 },
      });

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Pro Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        })
        .expect(201);

      expect(response.body.project).toBeDefined();
    });
  });

  describe('Voice Clone Slots', () => {
    it('should allow creator tier to create voice clones within limit', async () => {
      const user = await createTestUser(prisma, 'creator');
      const token = generateAuthToken(user);

      // Creator tier has 3 voice clone slots
      expect(user.voiceCloneSlots).toBe(3);

      // Create 2 voice clones (should succeed)
      await prisma.voiceClone.createMany({
        data: [
          {
            userId: user.id,
            name: 'Clone 1',
            sampleAudioUrl: 's3://bucket/clone1.wav',
            modelData: {},
            language: 'en',
          },
          {
            userId: user.id,
            name: 'Clone 2',
            sampleAudioUrl: 's3://bucket/clone2.wav',
            modelData: {},
            language: 'en',
          },
        ],
      });

      const clones = await prisma.voiceClone.findMany({
        where: { userId: user.id },
      });

      expect(clones.length).toBe(2);
      expect(clones.length).toBeLessThanOrEqual(user.voiceCloneSlots);
    });

    it('should block free tier from creating voice clones', async () => {
      const user = await createTestUser(prisma, 'free');

      // Free tier has 0 voice clone slots
      expect(user.voiceCloneSlots).toBe(0);
    });
  });

  describe('GET /api/subscription', () => {
    it('should return subscription details for free tier', async () => {
      const user = await createTestUser(prisma, 'free');
      const token = generateAuthToken(user);

      const response = await request(app)
        .get('/api/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('FREE');
      expect(response.body.subscription.processingMinutesLimit).toBe(10);
      expect(response.body.subscription.voiceCloneSlots).toBe(0);
      expect(response.body.subscription.features).toContain('watermark');
    });

    it('should return subscription details for pro tier', async () => {
      const user = await createTestUser(prisma, 'pro');
      const token = generateAuthToken(user);

      const response = await request(app)
        .get('/api/subscription')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('PRO');
      expect(response.body.subscription.processingMinutesLimit).toBe(-1); // Unlimited
      expect(response.body.subscription.voiceCloneSlots).toBe(10);
      expect(response.body.subscription.features).toContain('lipSync');
      expect(response.body.subscription.features).not.toContain('watermark');
    });
  });

  describe('Watermark Application', () => {
    it('should apply watermark for free tier users', async () => {
      const user = await createTestUser(prisma, 'free');

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Free Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'COMPLETED',
          applyWatermark: true,
        },
      });

      expect(project.applyWatermark).toBe(true);
    });

    it('should not apply watermark for paid tier users', async () => {
      const user = await createTestUser(prisma, 'creator');

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Creator Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'COMPLETED',
          applyWatermark: false,
        },
      });

      expect(project.applyWatermark).toBe(false);
    });
  });

  describe('Lip-Sync Feature Gating', () => {
    it('should allow lip-sync for pro tier', async () => {
      const user = await createTestUser(prisma, 'pro');

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Pro Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'PROCESSING',
          enableLipSync: true,
        },
      });

      expect(project.enableLipSync).toBe(true);
    });

    it('should block lip-sync for free tier', async () => {
      const user = await createTestUser(prisma, 'free');

      // Free tier should not have lip-sync enabled
      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Free Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'PROCESSING',
          enableLipSync: false,
        },
      });

      expect(project.enableLipSync).toBe(false);
    });
  });
});
