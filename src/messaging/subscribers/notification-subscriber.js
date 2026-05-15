// Subscriber that turns integration events into notifications.
// Owns its own idempotency tracking — at-least-once delivery means
// the same eventId may arrive twice; we must only act once.
class NotificationSubscriber {
  #notifier;
  #processedEventIds = new Set();

  constructor({ notifier }) {
    this.#notifier = notifier;
  }

  // Convenience: subscribes itself to all events it cares about.
  registerOn(eventBus) {
    eventBus.subscribe('UserRegistered', (e) => this.onUserRegistered(e));
    eventBus.subscribe('BookingCreated', (e) => this.onBookingCreated(e));
    eventBus.subscribe('BookingCancelled', (e) => this.onBookingCancelled(e));
  }

  async onUserRegistered(event) {
    if (this.#alreadyProcessed(event)) return;
    await this.#notifier.sendWelcome({
      userId: event.userId,
      email: event.email,
      name: event.name,
    });
    this.#markProcessed(event);
  }

  async onBookingCreated(event) {
    if (this.#alreadyProcessed(event)) return;
    await this.#notifier.sendBookingConfirmation({
      bookingId: event.bookingId,
      userId: event.userId,
      email: event.email,
      name: event.name,
      classTitle: event.classTitle,
      startsAt: event.startsAt,
    });
    this.#markProcessed(event);
  }

  async onBookingCancelled(event) {
    if (this.#alreadyProcessed(event)) return;
    await this.#notifier.sendBookingCancellation({
      bookingId: event.bookingId,
      userId: event.userId,
      email: event.email,
      name: event.name,
      classTitle: event.classTitle,
    });
    this.#markProcessed(event);
  }

  #alreadyProcessed(event) {
    return this.#processedEventIds.has(event.eventId);
  }

  #markProcessed(event) {
    this.#processedEventIds.add(event.eventId);
  }
}

module.exports = { NotificationSubscriber };
