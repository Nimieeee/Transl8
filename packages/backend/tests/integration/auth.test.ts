import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../src/routes/auth';
import { prisma } from '../setup';
import { testUsers } from '../fixtures/users';

describe('Authentication API', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.subscriptionTier).toBe('FREE');
      expect(response.body.user.processingMinutesLimit).toBe(10);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should reject registration with existing email', async () => {
      // Create user first
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
      });

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
        })
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/api/auth/register').send({
        email: testUsers.free.email,
        password: testUsers.free.password,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.free.email,
          password: testUsers.free.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testUsers.free.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUsers.free.password,
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.free.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and get tokens
      const response = await request(app).post('/api/auth/register').send({
        email: 'refresh@test.com',
        password: 'SecurePass123!',
      });

      refreshToken = response.body.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject refresh with revoked token', async () => {
      // Use the token once
      await request(app).post('/api/auth/refresh').send({ refreshToken });

      // Try to use it again (should be revoked)
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(403);

      expect(response.body.error.code).toBe('REFRESH_TOKEN_REVOKED');
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'logout@test.com',
        password: 'SecurePass123!',
      });

      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should logout and invalidate refresh token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Try to use the refresh token (should be invalid)
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(403);

      expect(response.body.error.code).toBe('REFRESH_TOKEN_REVOKED');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'me@test.com',
        password: 'SecurePass123!',
      });

      accessToken = response.body.tokens.accessToken;
      userId = response.body.user.id;
    });

    it('should return current user information', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe('me@test.com');
      expect(response.body.user.subscriptionTier).toBe('FREE');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
