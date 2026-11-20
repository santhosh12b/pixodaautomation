import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Task 2: Express Application & Middleware', () => {
  const app = createApp();

  it('GET /api/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.environment).toBeDefined();
  });

  it('CORS preflight OPTIONS should respond with allow headers and origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('Unknown route should return 404 with structured JSON', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toContain('Route GET /api/unknown-endpoint not found');
  });

  it('POST /api/auth/login should authenticate valid credentials and reject invalid ones', async () => {
    // Valid login
    const validRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'theeditingcrew', password: 'Dunesday@17' });
    expect(validRes.status).toBe(200);
    expect(validRes.body.token).toBeDefined();
    expect(validRes.body.user.username).toBe('theeditingcrew');

    // Invalid login
    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'theeditingcrew', password: 'WrongPassword' });
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.error).toBe('Unauthorized');
  });
});
