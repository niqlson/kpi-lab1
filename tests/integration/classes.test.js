const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp, futureIso } = require('../helpers');

async function loginAdmin(app) {
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'admin12345' });
  return res.body.token;
}

async function registerClient(app, email = 'client@test.local') {
  const res = await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Client' });
  return res.body.token;
}

test('POST /api/classes without token returns 401', async () => {
  const { app } = buildTestApp();
  const res = await request(app).post('/api/classes').send({});
  assert.equal(res.status, 401);
});

test('POST /api/classes as non-admin returns 403', async () => {
  const { app } = buildTestApp();
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
    });
  assert.equal(res.status, 403);
});

test('POST /api/classes as admin with valid input returns 201', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', description: 'Hatha yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Yoga');
  assert.equal(res.body.capacity, 10);
  assert.ok(res.body.id);
});

test('POST /api/classes rejects past startsAt with 400', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: '2000-01-01T10:00:00.000Z',
      endsAt: '2000-01-01T11:00:00.000Z',
      capacity: 10,
    });
  assert.equal(res.status, 400);
});

test('POST /api/classes rejects endsAt before startsAt with 400', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(120),
      endsAt: futureIso(60),
      capacity: 10,
    });
  assert.equal(res.status, 400);
});

test('GET /api/classes returns only upcoming classes', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Pilates', instructor: 'Mark',
      startsAt: futureIso(30), endsAt: futureIso(90), capacity: 8,
    });
  const res = await request(app).get('/api/classes');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].title, 'Pilates');
});

test('GET /api/classes/:id returns 404 for missing class', async () => {
  const { app } = buildTestApp();
  const res = await request(app).get('/api/classes/9999');
  assert.equal(res.status, 404);
});

test('PATCH /api/classes/:id as admin updates fields', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  const create = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
    });
  const res = await request(app).patch(`/api/classes/${create.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Power Yoga', capacity: 12 });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Power Yoga');
  assert.equal(res.body.capacity, 12);
});

test('PATCH /api/classes/:id returns 404 for missing class', async () => {
  const { app } = buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).patch('/api/classes/9999')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'X' });
  assert.equal(res.status, 404);
});

test('DELETE /api/classes/:id as admin returns 204 and cascades bookings', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const clientToken = await registerClient(app);
  const create = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Spin', instructor: 'Joe',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
    });
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: create.body.id });
  const res = await request(app).delete(`/api/classes/${create.body.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 204);
  const mine = await request(app).get('/api/bookings/my')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(mine.body.items.length, 0);
});

test('DELETE /api/classes/:id as non-admin returns 403', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const clientToken = await registerClient(app);
  const create = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'X', instructor: 'Y',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
    });
  const res = await request(app).delete(`/api/classes/${create.body.id}`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(res.status, 403);
});
