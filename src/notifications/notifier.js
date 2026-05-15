// The auxiliary component's contract. Lives in its own module —
// command handlers depend on this interface, not on a concrete impl.
class Notifier {
  async sendWelcome(_payload) { throw new Error('Notifier.sendWelcome not implemented'); }
  async sendBookingConfirmation(_payload) { throw new Error('Notifier.sendBookingConfirmation not implemented'); }
  async sendBookingCancellation(_payload) { throw new Error('Notifier.sendBookingCancellation not implemented'); }
}

module.exports = { Notifier };
