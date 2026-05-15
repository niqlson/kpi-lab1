// End-to-end demonstration of the lab 4 observation:
// in sync mode the client waits for the side effect; in async mode it does not.
// Same handler code, same event, only the bus implementation changes.

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { buildTestApp } = require('../../helpers/test-app');
const { InMemoryNotifier } = require('../../../src/modules/notifications/infrastructure/in-memory-notifier');
const { FailingNotifier } = require('../../../src/modules/notifications/infrastructure/failing-notifier');
const { futureIso } = require('../../helpers/fakes');

const SLOW_MS = 80;

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
async function createClass(app, adminToken) {
  const res = await request(app).post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Yoga', instructor: 'Anna', startsAt: futureIso(60), endsAt: futureIso(120), capacity: 5 });
  return res.body.id;
}

test('sync mode: POST /api/bookings response time includes the notifier delay', async () => {
  const notifier = new InMemoryNotifier({ delayMs: SLOW_MS });
  const { app } = await buildTestApp({ communicationMode: 'sync', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);

  const t0 = Date.now();
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const elapsed = Date.now() - t0;
  assert.equal(res.status, 201);
  assert.ok(elapsed >= SLOW_MS, `sync request should take >= ${SLOW_MS}ms, got ${elapsed}`);
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});

test('async mode: POST /api/bookings response is fast; notification arrives after', async () => {
  const notifier = new InMemoryNotifier({ delayMs: SLOW_MS });
  const { app, container } = await buildTestApp({ communicationMode: 'async', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);

  const t0 = Date.now();
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const elapsed = Date.now() - t0;
  assert.equal(res.status, 201);
  assert.ok(elapsed < SLOW_MS, `async request should be < ${SLOW_MS}ms, got ${elapsed}`);
  await container.eventBus.drain();
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});

test('sync mode + failing notifier: booking still succeeds (log-and-continue policy)', async () => {
  const { app } = await buildTestApp({ communicationMode: 'sync', notifier: new FailingNotifier() });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  assert.equal(res.status, 201, 'failing notifier must not roll back the booking');
  assert.ok(res.body.id);
});

test('async mode + failing notifier: booking still succeeds; subscriber failure is invisible to caller', async () => {
  const failing = new FailingNotifier();
  const { app, container } = await buildTestApp({ communicationMode: 'async', notifier: failing });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  assert.equal(res.status, 201);
  await container.eventBus.drain();
  assert.ok(failing.attempts >= 1, 'subscriber should have tried');
});

test('subscriber registers welcome on register and confirmation on book', async () => {
  const notifier = new InMemoryNotifier();
  const { app, container } = await buildTestApp({ communicationMode: 'async', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app, 'flow@x.com');
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  await container.eventBus.drain();
  assert.equal(notifier.countByType('welcome'), 1);
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});
