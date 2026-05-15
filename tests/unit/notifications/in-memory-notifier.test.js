const test = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryNotifier } = require('../../../src/modules/notifications/infrastructure/in-memory-notifier');

test('InMemoryNotifier records welcome notifications', async () => {
  const n = new InMemoryNotifier();
  await n.sendWelcome({ userId: 'u-1', email: 'a@x.com', name: 'Alice' });
  assert.equal(n.countByType('welcome'), 1);
  assert.equal(n.all()[0].to, 'a@x.com');
});

test('InMemoryNotifier records booking confirmation with class info in the body', async () => {
  const n = new InMemoryNotifier();
  await n.sendBookingConfirmation({
    bookingId: 'b-1', userId: 'u-1', email: 'a@x.com', name: 'Alice',
    classTitle: 'Yoga', startsAt: '2099-01-01T10:00:00Z',
  });
  const sent = n.all()[0];
  assert.equal(sent.type, 'booking-confirmation');
  assert.match(sent.body, /Yoga/);
  assert.match(sent.body, /Alice/);
});

test('InMemoryNotifier optional delay measurably blocks the caller', async () => {
  const n = new InMemoryNotifier({ delayMs: 50 });
  const t0 = Date.now();
  await n.sendWelcome({ userId: 'u', email: 'e', name: 'n' });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= 45, `expected >=45ms, got ${elapsed}`);
});
