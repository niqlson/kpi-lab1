// Notifications module — public contract.
//
// Other modules don't import notifier.js or any infrastructure file —
// they wire the module via `buildNotificationsModule`.

const { InMemoryNotifier } = require('./infrastructure/in-memory-notifier');
const { ConsoleNotifier } = require('./infrastructure/console-notifier');
const { CoreEventTranslator } = require('./acl/core-event-translator');
const { NotificationSubscriber } = require('./subscribers/notification-subscriber');

function buildNotificationsModule({ eventBus, notifier } = {}) {
  // Default to in-memory if no notifier provided (tests + dev mode).
  const effectiveNotifier = notifier ?? new InMemoryNotifier();
  const translator = new CoreEventTranslator();
  const subscriber = new NotificationSubscriber({
    notifier: effectiveNotifier,
    translator,
  });
  if (eventBus) subscriber.registerOn(eventBus);
  return {
    notifier: effectiveNotifier,
    subscriber,
  };
}

module.exports = {
  buildNotificationsModule,
  // Exported notifier implementations so app/tests can choose one.
  InMemoryNotifier,
  ConsoleNotifier,
};
