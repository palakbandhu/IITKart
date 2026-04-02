import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Auth API', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test.user@iitk.ac.in' } });
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test.user@iitk.ac.in',
        password: 'password123',
        role: 'user'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test.user@iitk.ac.in');
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.user@iitk.ac.in',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('should initiate forgot password flow', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        identifier: 'test.user@iitk.ac.in'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OTP sent');
  });
});
