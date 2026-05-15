const { Notifier } = require('./notifier');

// For dev mode — prints what would have been sent.
class ConsoleNotifier extends Notifier {
  async sendWelcome({ email, name }) {
    console.log(`[notifier] welcome → ${email}: Hi ${name}!`);
  }

  async sendBookingConfirmation({ email, name, classTitle, startsAt }) {
    console.log(`[notifier] booking-confirmation → ${email}: ${name}, "${classTitle}" on ${startsAt}`);
  }

  async sendBookingCancellation({ email, name, classTitle }) {
    console.log(`[notifier] booking-cancellation → ${email}: ${name}, "${classTitle}"`);
  }
}

module.exports = { ConsoleNotifier };
