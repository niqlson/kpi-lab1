// End-to-end demonstration of the lab's central observation:
// in sync mode the client waits for the side effect; in async mode it does not.
// Same handler code, same event, only the bus implementation changes.

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { openDatabase } = require('../../../src/infrastructure/db/connection');
const { createApp } = require('../../../src/presentation/app');
const { buildContainer, seedAdmin } = require('../../../src/presentation/composition-root');
const { InMemoryNotifier } = require('../../../src/notifications/in-memory-notifier');
const { FailingNotifier } = require('../../../src/notifications/failing-notifier');
const { futureIso } = require('../../helpers/fakes');

const SLOW_MS = 80;  // notifier delay used to make the difference observable

async function buildAppFor({ communicationMode, notifier }) {
  const db = openDatabase(':memory:');
  const container = buildContainer({
    db, jwtSecret: 'test-secret', communicationMode, notifier,
  });
  await seedAdmin({ container, email: 'admin@test.local', password: 'admin12345' });
  const app = createApp({
    handlers: container.handlers,
    tokenService: container.services.tokenService,
  });
  return { app, container };
}

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
  const { app } = await buildAppFor({ communicationMode: 'sync', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);

  const t0 = Date.now();
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const elapsed = Date.now() - t0;
  assert.equal(res.status, 201);
  assert.ok(elapsed >= SLOW_MS, `sync request should take >= ${SLOW_MS}ms, got ${elapsed}`);
  // Notification has happened by the time the client gets a response.
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});

test('async mode: POST /api/bookings response is fast; notification arrives after', async () => {
  const notifier = new InMemoryNotifier({ delayMs: SLOW_MS });
  const { app, container } = await buildAppFor({ communicationMode: 'async', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);

  const t0 = Date.now();
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  const elapsed = Date.now() - t0;
  assert.equal(res.status, 201);
  assert.ok(elapsed < SLOW_MS, `async request should be < ${SLOW_MS}ms, got ${elapsed}`);
  // Notification has not been delivered yet at this exact moment...
  // ...wait for the bus to drain, then it should be there.
  await container.messaging.eventBus.drain();
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});

test('sync mode + failing notifier: booking still succeeds (log-and-continue policy)', async () => {
  const { app } = await buildAppFor({ communicationMode: 'sync', notifier: new FailingNotifier() });
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
  const { app, container } = await buildAppFor({ communicationMode: 'async', notifier: failing });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app);
  const res = await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  assert.equal(res.status, 201);
  await container.messaging.eventBus.drain();
  assert.ok(failing.attempts >= 1, 'subscriber should have tried');
});

test('subscriber registers welcome on register and confirmation on book', async () => {
  const notifier = new InMemoryNotifier();
  const { app, container } = await buildAppFor({ communicationMode: 'async', notifier });
  const adminToken = await loginAdmin(app);
  const classId = await createClass(app, adminToken);
  const clientToken = await registerClient(app, 'flow@x.com');
  await request(app).post('/api/bookings')
    .set('Authorization', `Bearer ${clientToken}`).send({ classId });
  await container.messaging.eventBus.drain();
  assert.equal(notifier.countByType('welcome'), 1);
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});
