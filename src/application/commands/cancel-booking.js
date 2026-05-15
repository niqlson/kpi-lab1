const { NotFoundError, ConflictError } = require('../../domain/errors');
const { BookingCancelled } = require('../../messaging/events/booking-cancelled');

class CancelBookingCommand {
  constructor({ bookingId, userId }) {
    this.bookingId = bookingId;
    this.userId = userId;
  }
}

class CancelBookingHandler {
  #bookingRepository;
  #fitnessClassRepository;
  #userRepository;
  #eventBus;
  #clock;

  constructor({ bookingRepository, fitnessClassRepository, userRepository, eventBus, clock }) {
    this.#bookingRepository = bookingRepository;
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#userRepository = userRepository;
    this.#eventBus = eventBus;
    this.#clock = clock ?? (() => new Date());
  }

  async handle(command) {
    const booking = await this.#bookingRepository.findById(command.bookingId);
    if (!booking || !booking.belongsTo(command.userId)) {
      throw new NotFoundError('booking not found');
    }
    const cls = await this.#fitnessClassRepository.findById(booking.classId);
    if (cls && cls.hasStarted(this.#clock())) {
      throw new ConflictError('cannot cancel a booking for a class that has started');
    }
    await this.#bookingRepository.delete(command.bookingId);

    if (this.#eventBus) {
      const user = await this.#userRepository.findById(command.userId);
      const result = this.#eventBus.publish(new BookingCancelled({
        bookingId: booking.id,
        userId: user.id,
        email: user.email.value,
        name: user.name,
        classId: cls?.id ?? booking.classId,
        classTitle: cls?.title ?? '(unknown class)',
        occurredAt: new Date().toISOString(),
      }));
      if (result && typeof result.then === 'function') await result;
    }
  }
}

module.exports = { CancelBookingCommand, CancelBookingHandler };
