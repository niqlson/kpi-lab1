const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp, futureIso } = require('../helpers');

async function loginAdmin(app) {
  const res = await request(app).post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'admin12345' });
  return res.body.token;
}

async function registerClient(app, email = 'c1@test.local') {
  const res = await request(app).post('/api/auth/register')
    .send({ email, password: 'password123', name: email });
  return res.body.token;
}

async function createClass(app, adminToken, overrides = {}) {
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Yoga', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 2,
      ...overrides,
    });
  return res.body;
}

test('POST /api/bookings without token returns 401', async () => {
  const { app } = buildTestApp();
  const res = await request(app).post('/api/bookings').send({ classId: 1 });
  assert.equal(res.status, 401);
});

test('POST /api/bookings books a class for the caller', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: cls.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.classId, cls.id);
});

test('POST /api/bookings returns 404 for unknown class', async () => {
  const { app } = buildTestApp();
  const token = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ classId: 9999 });
  assert.equal(res.status, 404);
});

test('POST /api/bookings returns 400 when classId missing or not integer', async () => {
  const { app } = buildTestApp();
  const token = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ classId: 'abc' });
  assert.equal(res.status, 400);
});

test('POST /api/bookings returns 409 on duplicate booking', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: cls.id });
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: cls.id });
  assert.equal(res.status, 409);
});

test('POST /api/bookings returns 409 when class is full', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken, { capacity: 1 });
  const c1 = await registerClient(app, 'a@test.local');
  const c2 = await registerClient(app, 'b@test.local');
  const ok = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c1}`)
    .send({ classId: cls.id });
  assert.equal(ok.status, 201);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c2}`)
    .send({ classId: cls.id });
  assert.equal(res.status, 409);
});

test('GET /api/bookings/my returns only caller bookings', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken, { capacity: 5 });
  const c1 = await registerClient(app, 'm1@test.local');
  const c2 = await registerClient(app, 'm2@test.local');
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c1}`)
    .send({ classId: cls.id });
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c2}`)
    .send({ classId: cls.id });
  const res = await request(app).get('/api/bookings/my')
    .set('Authorization', `Bearer ${c1}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].class.title, 'Yoga');
});

test('DELETE /api/bookings/:id cancels own booking', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const made = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ classId: cls.id });
  const res = await request(app).delete(`/api/bookings/${made.body.id}`)
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(res.status, 204);
});

test('DELETE /api/bookings/:id returns 404 for another user\'s booking', async () => {
  const { app } = buildTestApp();
  const adminToken = await loginAdmin(app);
  const cls = await createClass(app, adminToken);
  const c1 = await registerClient(app, 'own@test.local');
  const c2 = await registerClient(app, 'thief@test.local');
  const made = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c1}`)
    .send({ classId: cls.id });
  const res = await request(app).delete(`/api/bookings/${made.body.id}`)
    .set('Authorization', `Bearer ${c2}`);
  assert.equal(res.status, 404);
});
