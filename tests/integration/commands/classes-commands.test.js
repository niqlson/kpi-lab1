const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('../../helpers/test-app');
const { futureIso } = require('../../helpers/fakes');

async function loginAdmin(app) {
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'admin12345' });
  return res.body.token;
}

async function registerClient(app, email = 'client@x.com') {
  const res = await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email });
  return res.body.token;
}

test('POST /api/classes returns 401 without token', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/classes').send({});
  assert.equal(res.status, 401);
});

test('POST /api/classes returns 403 for non-admin', async () => {
  const { app } = await buildTestApp();
  const token = await registerClient(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'X', instructor: 'Y', startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5 });
  assert.equal(res.status, 403);
});

test('POST /api/classes (admin) returns {id} only', async () => {
  const { app } = await buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10,
    });
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'string');
  assert.equal(res.body.title, undefined); // command does not return data
});

test('POST /api/classes returns 400 on past startsAt', async () => {
  const { app } = await buildTestApp();
  const token = await loginAdmin(app);
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Y', instructor: 'A',
      startsAt: '2000-01-01T10:00:00Z', endsAt: '2000-01-01T11:00:00Z', capacity: 10,
    });
  assert.equal(res.status, 400);
});

test('PATCH then GET shows the update applied (read-after-write)', async () => {
  const { app } = await buildTestApp();
  const token = await loginAdmin(app);
  const created = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Yoga', instructor: 'Anna', startsAt: futureIso(60), endsAt: futureIso(120), capacity: 10 });
  const patch = await request(app).patch(`/api/classes/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Power Yoga', capacity: 12 });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.id, created.body.id);
  // verify by reading back via the query side
  const fetched = await request(app).get(`/api/classes/${created.body.id}`);
  assert.equal(fetched.body.title, 'Power Yoga');
  assert.equal(fetched.body.capacity, 12);
});

test('DELETE /api/classes/:id returns 204 and cascades bookings', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const clientToken = await registerClient(app);
  const created = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Spin', instructor: 'Joe', startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5 });
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: created.body.id });
  const res = await request(app).delete(`/api/classes/${created.body.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 204);
  const mine = await request(app).get('/api/bookings/my')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(mine.body.items.length, 0);
});
