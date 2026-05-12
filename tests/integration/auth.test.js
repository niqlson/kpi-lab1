const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('../helpers');

test('POST /api/auth/register creates a user and returns a token', async () => {
  const { app } = buildTestApp();
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
  const { app } = buildTestApp();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'password123', name: 'Bob' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/register rejects short password', async () => {
  const { app } = buildTestApp();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'short@test.local', password: 'abc', name: 'Bob' });
  assert.equal(res.status, 400);
});

test('POST /api/auth/register returns 409 on duplicate email', async () => {
  const { app } = buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'dup@test.local', password: 'password123', name: 'Dup' });
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'dup@test.local', password: 'password456', name: 'Dup2' });
  assert.equal(res.status, 409);
});

test('POST /api/auth/login returns token on valid credentials', async () => {
  const { app } = buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'login@test.local', password: 'password123', name: 'L' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'login@test.local', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('POST /api/auth/login returns 401 on wrong password', async () => {
  const { app } = buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'wrong@test.local', password: 'password123', name: 'W' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'wrong@test.local', password: 'WRONG-pass' });
  assert.equal(res.status, 401);
});

test('POST /api/auth/login returns 401 on unknown email', async () => {
  const { app } = buildTestApp();
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'nobody@test.local', password: 'password123' });
  assert.equal(res.status, 401);
});

test('GET /api/auth/me without a token returns 401', async () => {
  const { app } = buildTestApp();
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me with a token returns the user', async () => {
  const { app } = buildTestApp();
  const reg = await request(app).post('/api/auth/register')
    .send({ email: 'me@test.local', password: 'password123', name: 'Me' });
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${reg.body.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'me@test.local');
});

test('GET /api/auth/me with garbage token returns 401', async () => {
  const { app } = buildTestApp();
  const res = await request(app).get('/api/auth/me')
    .set('Authorization', 'Bearer not.a.real.jwt');
  assert.equal(res.status, 401);
});
