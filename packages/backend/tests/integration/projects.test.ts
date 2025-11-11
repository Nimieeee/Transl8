import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projects';
import { prisma } from '../setup';
import { createTestUser } from '../fixtures/users';
import { generateAuthToken } from '../utils/auth-helper';

describe('Projects API', () => {
  let app: Express;
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectRoutes);

    // Create test user
    const user = await createTestUser(prisma, 'free');
    userId = user.id;
    accessToken = generateAuthToken(user);
  });

  describe('POST /api/projects', () => {
    it('should create a new project with valid data', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        })
        .expect(201);

      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project.name).toBe('Test Project');
      expect(response.body.project.sourceLanguage).toBe('en');
      expect(response.body.project.targetLanguage).toBe('es');
      expect(response.body.project.status).toBe('UPLOADING');
    });

    it('should reject project with same source and target language', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Project',
          sourceLanguage: 'en',
          targetLanguage: 'en',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject project with unsupported language', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Project',
          sourceLanguage: 'xx',
          targetLanguage: 'es',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        })
        .expect(401);
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      // Create test projects
      await prisma.project.createMany({
        data: [
          {
            userId,
            name: 'Project 1',
            sourceLanguage: 'en',
            targetLanguage: 'es',
            status: 'UPLOADING',
          },
          {
            userId,
            name: 'Project 2',
            sourceLanguage: 'en',
            targetLanguage: 'fr',
            status: 'PROCESSING',
          },
        ],
      });
    });

    it('should list user projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.projects).toBeInstanceOf(Array);
      expect(response.body.projects.length).toBeGreaterThanOrEqual(2);
      expect(response.body.projects[0]).toHaveProperty('id');
      expect(response.body.projects[0]).toHaveProperty('name');
      expect(response.body.projects[0]).toHaveProperty('status');
    });

    it('should only return projects for authenticated user', async () => {
      // Create another user with projects
      const otherUser = await createTestUser(prisma, 'creator');
      await prisma.project.create({
        data: {
          userId: otherUser.id,
          name: 'Other User Project',
          sourceLanguage: 'en',
          targetLanguage: 'de',
          status: 'UPLOADING',
        },
      });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const projectNames = response.body.projects.map((p: any) => p.name);
      expect(projectNames).not.toContain('Other User Project');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Detail Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'UPLOADING',
        },
      });
      projectId = project.id;
    });

    it('should return project details', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.project.id).toBe(projectId);
      expect(response.body.project.name).toBe('Detail Project');
    });

    it('should reject access to other user project', async () => {
      const otherUser = await createTestUser(prisma, 'pro');
      const otherProject = await prisma.project.create({
        data: {
          userId: otherUser.id,
          name: 'Other Project',
          sourceLanguage: 'en',
          targetLanguage: 'fr',
          status: 'UPLOADING',
        },
      });

      await request(app)
        .get(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Update Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'UPLOADING',
        },
      });
      projectId = project.id;
    });

    it('should update project configuration', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Project Name',
          targetLanguage: 'fr',
        })
        .expect(200);

      expect(response.body.project.name).toBe('Updated Project Name');
      expect(response.body.project.targetLanguage).toBe('fr');
    });

    it('should reject unauthorized access', async () => {
      const otherUser = await createTestUser(prisma, 'creator');
      const otherToken = generateAuthToken(otherUser);

      await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Delete Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'UPLOADING',
        },
      });
      projectId = project.id;
    });

    it('should delete project', async () => {
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deletedProject = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(deletedProject).toBeNull();
    });

    it('should reject unauthorized deletion', async () => {
      const otherUser = await createTestUser(prisma, 'pro');
      const otherToken = generateAuthToken(otherUser);

      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('GET /api/projects/:id/status', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Status Project',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          status: 'PROCESSING',
          duration: 120,
        },
      });
      projectId = project.id;

      // Create job for the project
      await prisma.job.create({
        data: {
          projectId,
          stage: 'STT',
          status: 'PROCESSING',
          progress: 50,
        },
      });
    });

    it('should return project status and progress', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('currentStage');
      expect(response.body).toHaveProperty('progress');
    });
  });
});
