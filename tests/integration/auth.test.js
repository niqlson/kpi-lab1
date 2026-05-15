const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('../helpers/test-app');

test('POST /api/auth/register creates a user and returns a token', async () => {
  const { app } = await buildTestApp();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'alice@test.local', password: 'password123', name: 'Alice' });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'alice@test.local');
  assert.equal(res.body.user.role, 'client');
  assert.equal(res.body.user.password_hash, undefined);
});

test('POST /api/auth/register rejects invalid email', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'password123', name: 'Bob' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/register rejects short password', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'a@b.com', password: 'abc', name: 'Bob' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/register returns 409 on duplicate email', async () => {
  const { app } = await buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'dup@x.com', password: 'password123', name: 'A' });
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'dup@x.com', password: 'password456', name: 'B' });
  assert.equal(res.status, 409);
});

test('POST /api/auth/login returns 200 on valid credentials', async () => {
  const { app } = await buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'l@x.com', password: 'password123', name: 'L' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'l@x.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('POST /api/auth/login returns 401 on wrong password', async () => {
  const { app } = await buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'w@x.com', password: 'password123', name: 'W' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'w@x.com', password: 'WRONG-pass' });
  assert.equal(res.status, 401);
});

test('GET /api/auth/me without a token returns 401', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me with a token returns the user', async () => {
  const { app } = await buildTestApp();
  const reg = await request(app).post('/api/auth/register')
    .send({ email: 'me@x.com', password: 'password123', name: 'Me' });
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'me@x.com');
});

test('GET /api/auth/me with garbage token returns 401', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', 'Bearer not.a.real.jwt');
  assert.equal(res.status, 401);
});

test('seeded admin can log in', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'admin12345' });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'admin');
});
