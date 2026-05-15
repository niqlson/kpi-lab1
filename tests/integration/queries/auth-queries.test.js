const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('../../helpers/test-app');

test('GET /api/auth/me without token → 401', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me with garbage token → 401', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', 'Bearer not.a.real.jwt');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me returns the UserReadModel shape (no passwordHash)', async () => {
  const { app } = await buildTestApp();
  const reg = await request(app).post('/api/auth/register')
    .send({ email: 'me@x.com', password: 'password123', name: 'Me' });
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'me@x.com');
  assert.equal(res.body.user.name, 'Me');
  assert.equal(res.body.user.role, 'client');
  assert.ok(res.body.user.id);
  assert.ok(res.body.user.createdAt);
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(res.body.user.password_hash, undefined);
});

test('GET /api/auth/me as the seeded admin returns role=admin', async () => {
  const { app } = await buildTestApp();
  const login = await request(app).post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'admin12345' });
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'admin');
});
