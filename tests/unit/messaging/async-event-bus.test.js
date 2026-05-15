const test = require('node:test');
const assert = require('node:assert/strict');
const { AsyncEventBus } = require('../../../src/shared/messaging/async-event-bus');

const evt = (name) => ({ eventName: name, eventId: `id-${Math.random()}` });

test('AsyncEventBus.publish returns synchronously without awaiting subscribers', async () => {
  const bus = new AsyncEventBus();
  let subscriberFinished = false;
  bus.subscribe('Demo', async () => {
    await new Promise((r) => setTimeout(r, 30));
    subscriberFinished = true;
  });
  const t0 = Date.now();
  const r = bus.publish(evt('Demo'));
  const elapsed = Date.now() - t0;
  assert.equal(r, undefined, 'publish() must not return a promise');
  assert.equal(subscriberFinished, false, 'subscriber must not have finished yet');
  assert.ok(elapsed < 10, `publish must be near-instant, took ${elapsed}ms`);
  await bus.drain();
  assert.equal(subscriberFinished, true);
});

test('AsyncEventBus.drain waits for all in-flight deliveries', async () => {
  const bus = new AsyncEventBus();
  let count = 0;
  bus.subscribe('Demo', async () => {
    await new Promise((r) => setTimeout(r, 10));
    count += 1;
  });
  for (let i = 0; i < 5; i += 1) bus.publish(evt('Demo'));
  await bus.drain();
  assert.equal(count, 5);
});

test('AsyncEventBus subscriber failure is isolated and logged', async () => {
  const errors = [];
  const bus = new AsyncEventBus({ onError: (err) => errors.push(err.message) });
  bus.subscribe('Demo', () => { throw new Error('boom'); });
  bus.publish(evt('Demo'));
  await bus.drain();
  assert.deepEqual(errors, ['boom']);
});
