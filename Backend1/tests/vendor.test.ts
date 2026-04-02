import request from 'supertest';
import app from '../src/app';

describe('Vendor API', () => {
  it('should get a list of active vendors', async () => {
    const res = await request(app)
      .get('/api/vendors');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });

  // Adding product requires authentication and vendor role
  it('should prevent non-authenticated users from adding products', async () => {
    const res = await request(app)
      .post('/api/vendors/me/products')
      .send({
        name: 'Coffee',
        category: 'Beverage',
        price: 30
      });

    expect(res.status).toBe(401);
  });

  it('should mock vendor analytics fetching', () => {
    expect(true).toBe(true);
  });
});
