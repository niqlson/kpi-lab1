const { Notifier } = require('./notifier');

// For tests: simulates a flaky external service.
class FailingNotifier extends Notifier {
  constructor({ message = 'notifier is down' } = {}) {
    super();
    this.message = message;
    this.attempts = 0;
  }
  async sendWelcome() { this.attempts += 1; throw new Error(this.message); }
  async sendBookingConfirmation() { this.attempts += 1; throw new Error(this.message); }
  async sendBookingCancellation() { this.attempts += 1; throw new Error(this.message); }
}

module.exports = { FailingNotifier };
