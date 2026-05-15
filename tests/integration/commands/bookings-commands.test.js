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
async function registerClient(app, email = 'c@x.com') {
  const res = await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email });
  return res.body.token;
}
async function createClass(app, token, overrides = {}) {
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 2,
      ...overrides,
    });
  return res.body.id;
}

test('POST /api/bookings returns 401 without token', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).post('/api/bookings').send({ classId: 'x' });
  assert.equal(res.status, 401);
});

test('POST /api/bookings returns {id} only', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId });
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'string');
  assert.equal(res.body.classId, undefined);
});

test('POST /api/bookings returns 404 for unknown class', async () => {
  const { app } = await buildTestApp();
  const token = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ classId: 'nope' });
  assert.equal(res.status, 404);
});

test('POST /api/bookings returns 400 when classId missing', async () => {
  const { app } = await buildTestApp();
  const token = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${token}`).send({});
  assert.equal(res.status, 400);
});

test('POST /api/bookings returns 409 on duplicate booking', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  assert.equal(res.status, 409);
});

test('POST /api/bookings returns 409 when class is full', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken, { capacity: 1 });
  const c1 = await registerClient(app, 'a@x.com');
  const c2 = await registerClient(app, 'b@x.com');
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c1}`).send({ classId });
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c2}`).send({ classId });
  assert.equal(res.status, 409);
});

test('DELETE /api/bookings/:id cancels own booking', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const made = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const res = await request(app).delete(`/api/bookings/${made.body.id}`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(res.status, 204);
});

test("DELETE /api/bookings/:id returns 404 for another user's booking", async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const c1 = await registerClient(app, 'own@x.com');
  const c2 = await registerClient(app, 'thief@x.com');
  const made = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c1}`).send({ classId });
  const res = await request(app).delete(`/api/bookings/${made.body.id}`)
    .set('Authorization', `Bearer ${c2}`);
  assert.equal(res.status, 404);
});
