const { Notifier } = require('../domain/notifier');

// Records every "sent" notification in memory. For dev + tests:
// real production would use SendGrid, AWS SES, etc. behind the same interface.
class InMemoryNotifier extends Notifier {
  #log = [];
  #delayMs;

  constructor({ delayMs = 0 } = {}) {
    super();
    this.#delayMs = delayMs;
  }

  async sendWelcome({ userId, email, name }) {
    await this.#maybeDelay();
    this.#log.push({ type: 'welcome', userId, to: email, sentAt: new Date(), body: `Welcome, ${name}!` });
  }

  async sendBookingConfirmation({ bookingId, userId, email, name, classTitle, startsAt }) {
    await this.#maybeDelay();
    this.#log.push({
      type: 'booking-confirmation',
      bookingId, userId, to: email, sentAt: new Date(),
      body: `Hi ${name}, your booking for "${classTitle}" on ${startsAt} is confirmed.`,
    });
  }

  async sendBookingCancellation({ bookingId, userId, email, name, classTitle }) {
    await this.#maybeDelay();
    this.#log.push({
      type: 'booking-cancellation',
      bookingId, userId, to: email, sentAt: new Date(),
      body: `Hi ${name}, your booking for "${classTitle}" has been cancelled.`,
    });
  }

  all() { return [...this.#log]; }
  clear() { this.#log = []; }
  countByType(type) { return this.#log.filter((n) => n.type === type).length; }

  async #maybeDelay() {
    if (this.#delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.#delayMs));
    }
  }
}

module.exports = { InMemoryNotifier };
