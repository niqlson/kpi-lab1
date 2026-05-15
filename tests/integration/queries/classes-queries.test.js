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
      title: 'Yoga', description: 'Hatha', instructor: 'Anna',
      startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5,
      ...overrides,
    });
  return res.body.id;
}

test('GET /api/classes returns ReadModels with bookingsCount field', async () => {
  const { app } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const c1 = await registerClient(app, 'a@x.com');
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${c1}`).send({ classId });

  const res = await request(app).get('/api/classes');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  const item = res.body.items[0];
  assert.equal(item.title, 'Yoga');
  assert.equal(item.instructor, 'Anna');
  assert.equal(item.capacity, 5);
  // The Read Model includes denormalised booking count — domain entity does not have this.
  assert.equal(item.bookingsCount, 1);
});

test('GET /api/classes lists all upcoming classes ordered by startsAt', async () => {
  const { app } = await buildTestApp();
  const token = await loginAdmin(app);
  await createClass(app, token, { title: 'Later', startsAt: futureIso(120), endsAt: futureIso(180) });
  await createClass(app, token, { title: 'Sooner', startsAt: futureIso(30), endsAt: futureIso(90) });
  const res = await request(app).get('/api/classes');
  assert.equal(res.body.items[0].title, 'Sooner');
  assert.equal(res.body.items[1].title, 'Later');
});

test('GET /api/classes/:id returns full ReadModel', async () => {
  const { app } = await buildTestApp();
  const token = await loginAdmin(app);
  const id = await createClass(app, token, { capacity: 8 });
  const res = await request(app).get(`/api/classes/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, id);
  assert.equal(res.body.capacity, 8);
  assert.equal(res.body.bookingsCount, 0);
});

test('GET /api/classes/:id returns 404 for missing class', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/classes/does-not-exist');
  assert.equal(res.status, 404);
});
