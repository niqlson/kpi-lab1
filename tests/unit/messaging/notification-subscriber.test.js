const test = require('node:test');
const assert = require('node:assert/strict');
const { SyncEventBus } = require('../../../src/messaging/sync-event-bus');
const { NotificationSubscriber } = require('../../../src/messaging/subscribers/notification-subscriber');
const { InMemoryNotifier } = require('../../../src/notifications/in-memory-notifier');
const { FailingNotifier } = require('../../../src/notifications/failing-notifier');
const { BookingCreated } = require('../../../src/messaging/events/booking-created');
const { UserRegistered } = require('../../../src/messaging/events/user-registered');

function setup(notifier) {
  const bus = new SyncEventBus();
  const sub = new NotificationSubscriber({ notifier });
  sub.registerOn(bus);
  return { bus };
}

const bookingEvent = () => new BookingCreated({
  bookingId: 'b-1', userId: 'u-1', email: 'a@x.com', name: 'Alice',
  classId: 'c-1', classTitle: 'Yoga', startsAt: '2099-01-01T10:00:00Z',
  occurredAt: '2099-01-01T09:00:00Z',
});

test('NotificationSubscriber turns BookingCreated into a confirmation', async () => {
  const notifier = new InMemoryNotifier();
  const { bus } = setup(notifier);
  await bus.publish(bookingEvent());
  assert.equal(notifier.countByType('booking-confirmation'), 1);
});

test('NotificationSubscriber is idempotent — same eventId delivered twice = one notification', async () => {
  const notifier = new InMemoryNotifier();
  const { bus } = setup(notifier);
  const event = bookingEvent();
  await bus.publish(event);
  await bus.publish(event);  // duplicate delivery
  assert.equal(notifier.countByType('booking-confirmation'), 1, 'must deduplicate by eventId');
});

test('NotificationSubscriber treats two distinct events with the same payload as separate', async () => {
  const notifier = new InMemoryNotifier();
  const { bus } = setup(notifier);
  await bus.publish(bookingEvent());
  await bus.publish(bookingEvent());  // different eventId, same data
  assert.equal(notifier.countByType('booking-confirmation'), 2);
});

test('NotificationSubscriber routes UserRegistered to sendWelcome', async () => {
  const notifier = new InMemoryNotifier();
  const { bus } = setup(notifier);
  await bus.publish(new UserRegistered({
    userId: 'u-1', email: 'a@x.com', name: 'Alice', occurredAt: 'now',
  }));
  assert.equal(notifier.countByType('welcome'), 1);
});

test('NotificationSubscriber failure is contained by SyncEventBus, does not throw past publish()', async () => {
  const notifier = new FailingNotifier();
  const errors = [];
  const bus = new SyncEventBus({ onError: (err) => errors.push(err.message) });
  new NotificationSubscriber({ notifier }).registerOn(bus);
  await bus.publish(bookingEvent());  // must not throw
  assert.equal(errors.length, 1);
  assert.match(errors[0], /down/);
});
