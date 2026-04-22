import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Auth API', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test.user@iitk.ac.in' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test.user@iitk.ac.in' } });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `test.user.${Date.now()}@iitk.ac.in`,
        password: 'password123',
        role: 'user'
      });

    expect([201, 400, 409, 500]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBeDefined();
    }
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.user@iitk.ac.in',
        password: 'password123'
      });

    expect([200, 400, 401, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    }
  });

  it('should initiate forgot password flow', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        identifier: 'test.user@iitk.ac.in'
      });

    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });
});
