const test = require('node:test');
const assert = require('node:assert/strict');
const { SyncEventBus } = require('../../../src/shared/messaging/sync-event-bus');

const evt = (name) => ({ eventName: name, eventId: `id-${Math.random()}` });

test('SyncEventBus delivers an event to all matching subscribers', async () => {
  const bus = new SyncEventBus();
  const seen = [];
  bus.subscribe('Demo', (e) => { seen.push(`a-${e.eventId}`); });
  bus.subscribe('Demo', (e) => { seen.push(`b-${e.eventId}`); });
  const e = evt('Demo');
  await bus.publish(e);
  assert.deepEqual(seen, [`a-${e.eventId}`, `b-${e.eventId}`]);
});

test('SyncEventBus.publish returns a Promise that awaits subscribers', async () => {
  const bus = new SyncEventBus();
  let finished = false;
  bus.subscribe('Demo', async () => {
    await new Promise((r) => setTimeout(r, 30));
    finished = true;
  });
  const t0 = Date.now();
  await bus.publish(evt('Demo'));
  assert.equal(finished, true, 'publish() must wait for subscribers');
  assert.ok(Date.now() - t0 >= 25);
});

test('SyncEventBus continues other subscribers when one throws (logged via onError)', async () => {
  const errors = [];
  const bus = new SyncEventBus({ onError: (err) => errors.push(err.message) });
  const seen = [];
  bus.subscribe('Demo', () => { throw new Error('boom'); });
  bus.subscribe('Demo', () => { seen.push('ok'); });
  await bus.publish(evt('Demo'));
  assert.deepEqual(errors, ['boom']);
  assert.deepEqual(seen, ['ok']);
});

test('SyncEventBus ignores events with no subscribers', async () => {
  const bus = new SyncEventBus();
  await bus.publish(evt('NobodyCares'));  // no throw
});
