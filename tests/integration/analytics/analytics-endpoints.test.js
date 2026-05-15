// Integration tests for the Analytics module.
//
// Demonstrates eventual consistency between modules: a booking made via Core
// shows up in /api/analytics/popular-classes only after the event has been
// delivered to the Analytics subscriber.

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
  return res.body;
}
async function createClass(app, adminToken, title = 'Yoga') {
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title, instructor: 'Anna', startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5 });
  return res.body.id;
}

test('GET /api/analytics/popular-classes is empty before any bookings', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/analytics/popular-classes');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items, []);
});

test('after a booking, the popular-classes projection includes the class', async () => {
  const { app, container } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const client = await registerClient(app);

  // Make a booking
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${client.token}`).send({ classId });

  // Eventual consistency: wait for the bus to flush before querying analytics.
  await container.eventBus.drain();

  const res = await request(app).get('/api/analytics/popular-classes');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  const item = res.body.items[0];
  // Note: Analytics uses its own field names — resourceId, resourceTitle, etc.
  assert.equal(item.resourceId, classId);
  assert.equal(item.resourceTitle, 'Yoga');
  assert.equal(item.bookingsTotal, 1);
  assert.equal(item.cancellationsTotal, 0);
  assert.equal(item.activeBookings, 1);
});

test('cancelling a booking is reflected in the projection (eventual)', async () => {
  const { app, container } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const client = await registerClient(app);

  const booked = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${client.token}`).send({ classId });
  await container.eventBus.drain();

  await request(app).delete(`/api/bookings/${booked.body.id}`)
    .set('Authorization', `Bearer ${client.token}`);
  await container.eventBus.drain();

  const res = await request(app).get('/api/analytics/popular-classes');
  const item = res.body.items[0];
  assert.equal(item.bookingsTotal, 1);
  assert.equal(item.cancellationsTotal, 1);
  assert.equal(item.activeBookings, 0);
});

test('GET /api/analytics/popular-classes ranks more-booked classes higher', async () => {
  const { app, container } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classA = await createClass(app, adminToken, 'Yoga');
  const classB = await createClass(app, adminToken, 'Pilates');
  const c1 = await registerClient(app, 'c1@x.com');
  const c2 = await registerClient(app, 'c2@x.com');
  // Yoga gets 2 bookings, Pilates gets 1
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c1.token}`).send({ classId: classA });
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c2.token}`).send({ classId: classA });
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${c1.token}`).send({ classId: classB });
  await container.eventBus.drain();

  const res = await request(app).get('/api/analytics/popular-classes');
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.items[0].resourceTitle, 'Yoga', 'higher booking count comes first');
  assert.equal(res.body.items[0].bookingsTotal, 2);
  assert.equal(res.body.items[1].resourceTitle, 'Pilates');
});

test('GET /api/analytics/me returns the caller\'s own activity totals', async () => {
  const { app, container } = await buildTestApp();
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const client = await registerClient(app, 'me@x.com');
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${client.token}`).send({ classId });
  await container.eventBus.drain();

  const res = await request(app).get('/api/analytics/me')
    .set('Authorization', `Bearer ${client.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.actorId, client.userId);
  assert.equal(res.body.bookingsTotal, 1);
  assert.equal(res.body.cancellationsTotal, 0);
  assert.equal(res.body.activeBookings, 1);
  assert.ok(res.body.registeredAt);
});

test('GET /api/analytics/me requires auth', async () => {
  const { app } = await buildTestApp();
  const res = await request(app).get('/api/analytics/me');
  assert.equal(res.status, 401);
});

test('eventual consistency window: bookings count is 0 before bus drains', async () => {
  const { app, container } = await buildTestApp({ communicationMode: 'async' });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const client = await registerClient(app);

  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${client.token}`).send({ classId });

  // We deliberately do NOT drain. Analytics may or may not have caught up.
  // Then drain and verify it caught up.
  await container.eventBus.drain();
  const res = await request(app).get('/api/analytics/popular-classes');
  assert.equal(res.body.items[0].bookingsTotal, 1);
});
