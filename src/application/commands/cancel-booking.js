const { NotFoundError, ConflictError } = require('../../domain/errors');

class CancelBookingCommand {
  constructor({ bookingId, userId }) {
    this.bookingId = bookingId;
    this.userId = userId;
  }
}

class CancelBookingHandler {
  #bookingRepository;
  #fitnessClassRepository;
  #clock;

  constructor({ bookingRepository, fitnessClassRepository, clock }) {
    this.#bookingRepository = bookingRepository;
    this.#fitnessClassRepository = fitnessClassRepository;
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
  }
}

module.exports = { CancelBookingCommand, CancelBookingHandler };
