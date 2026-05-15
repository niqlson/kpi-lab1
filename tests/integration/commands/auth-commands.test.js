const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('../../helpers/test-app');

test('POST /api/auth/register returns {userId, token} (no full user)', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'alice@x.com', password: 'password123', name: 'Alice' });
  assert.equal(res.status, 201);
  assert.ok(res.body.userId);
  assert.ok(res.body.token);
  // Strict CQS: command response carries no full data
  assert.equal(res.body.user, undefined);
  assert.equal(res.body.email, undefined);
});

test('POST /api/auth/register returns 400 on bad email', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'nope', password: 'password123', name: 'A' });
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

test('POST /api/auth/login returns {userId, token}', async () => {
  const { app } = await buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'l@x.com', password: 'password123', name: 'L' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'l@x.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.ok(res.body.userId);
});

test('POST /api/auth/login returns 401 on wrong password', async () => {
  const { app } = await buildTestApp();
  await request(app).post('/api/auth/register')
    .send({ email: 'w@x.com', password: 'password123', name: 'W' });
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'w@x.com', password: 'WRONG' });
  assert.equal(res.status, 401);
});
