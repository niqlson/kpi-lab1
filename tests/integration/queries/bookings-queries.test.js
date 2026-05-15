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
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
      ...overrides,
    });
  return res.body.id;
}

test('GET /api/bookings/my requires auth', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/bookings/my');
  assert.equal(res.status, 401);
});

test('GET /api/bookings/my returns enriched ReadModel with denormalised class info', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });

  const res = await request(app).get('/api/bookings/my')
    .set('Authorization', `Bearer ${clientToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  const item = res.body.items[0];
  // Booking fields
  assert.ok(item.id);
  assert.equal(item.classId, classId);
  assert.ok(item.createdAt);
  // Denormalised class info — populated by the JOIN in the read repository
  assert.equal(item.class.id, classId);
  assert.equal(item.class.title, 'Yoga');
  assert.equal(item.class.instructor, 'Anna');
  assert.ok(item.class.startsAt);
  assert.ok(item.class.endsAt);
});

test('GET /api/bookings/my returns only the caller bookings', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const c1 = await registerClient(app, 'one@x.com');
  const c2 = await registerClient(app, 'two@x.com');
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c1}`).send({ classId });
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c2}`).send({ classId });
  const res = await request(app).get('/api/bookings/my').set('Authorization', `Bearer ${c1}`);
  assert.equal(res.body.items.length, 1);
});
