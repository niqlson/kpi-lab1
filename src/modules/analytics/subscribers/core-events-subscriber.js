const { RecordBookingCommand } = require('../application/commands/record-booking');
const { RecordCancellationCommand } = require('../application/commands/record-cancellation');
const { RecordRegistrationCommand } = require('../application/commands/record-registration');

// Bridges the event bus into Analytics's internal command handlers.
// The translator is the only thing that touches Core's event shape;
// from this file onward, everything speaks Analytics's internal vocabulary.
class CoreEventsSubscriber {
  #handlers;
  #translator;

  constructor({ handlers, translator }) {
    this.#handlers = handlers;
    this.#translator = translator;
  }

  registerOn(eventBus) {
    eventBus.subscribe('UserRegistered', (e) => this.onUserRegistered(e));
    eventBus.subscribe('BookingCreated', (e) => this.onBookingCreated(e));
    eventBus.subscribe('BookingCancelled', (e) => this.onBookingCancelled(e));
  }

  async onUserRegistered(event) {
    const metric = this.#translator.toRegistrationMetric(event);
    await this.#handlers.recordRegistration.handle(new RecordRegistrationCommand({ metric }));
  }

  async onBookingCreated(event) {
    const metric = this.#translator.toBookingMetric(event);
    await this.#handlers.recordBooking.handle(new RecordBookingCommand({ metric }));
  }

  async onBookingCancelled(event) {
    const metric = this.#translator.toCancellationMetric(event);
    await this.#handlers.recordCancellation.handle(new RecordCancellationCommand({ metric }));
  }
}

module.exports = { CoreEventsSubscriber };
