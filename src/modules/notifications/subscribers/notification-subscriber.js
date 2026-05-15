// Notifications subscriber.
//
// Receives Core integration events (only because the bus delivers them here),
// passes them through the ACL to get a Notifications-internal payload,
// then calls the notifier port. Idempotent by eventId.

class NotificationSubscriber {
  #notifier;
  #translator;
  #processedEventIds = new Set();

  constructor({ notifier, translator }) {
    this.#notifier = notifier;
    this.#translator = translator;
  }

  registerOn(eventBus) {
    eventBus.subscribe('UserRegistered', (e) => this.onUserRegistered(e));
    eventBus.subscribe('BookingCreated', (e) => this.onBookingCreated(e));
    eventBus.subscribe('BookingCancelled', (e) => this.onBookingCancelled(e));
  }

  async onUserRegistered(event) {
    if (this.#alreadyProcessed(event)) return;
    const payload = this.#translator.toWelcomePayload(event);
    await this.#notifier.sendWelcome({
      userId: payload.recipientUserId,
      email: payload.recipientEmail,
      name: payload.recipientName,
    });
    this.#markProcessed(event);
  }

  async onBookingCreated(event) {
    if (this.#alreadyProcessed(event)) return;
    const payload = this.#translator.toBookingConfirmationPayload(event);
    await this.#notifier.sendBookingConfirmation({
      bookingId: payload.bookingReference,
      userId: payload.recipientUserId,
      email: payload.recipientEmail,
      name: payload.recipientName,
      classTitle: payload.eventTitle,
      startsAt: payload.eventStartTime,
    });
    this.#markProcessed(event);
  }

  async onBookingCancelled(event) {
    if (this.#alreadyProcessed(event)) return;
    const payload = this.#translator.toBookingCancellationPayload(event);
    await this.#notifier.sendBookingCancellation({
      bookingId: payload.bookingReference,
      userId: payload.recipientUserId,
      email: payload.recipientEmail,
      name: payload.recipientName,
      classTitle: payload.eventTitle,
    });
    this.#markProcessed(event);
  }

  #alreadyProcessed(event) { return this.#processedEventIds.has(event.eventId); }
  #markProcessed(event) { this.#processedEventIds.add(event.eventId); }
}

module.exports = { NotificationSubscriber };
