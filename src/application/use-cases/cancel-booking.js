const { NotFoundError, ConflictError } = require('../../domain/errors');

class CancelBooking {
  #bookingRepository;
  #fitnessClassRepository;
  #clock;

  constructor({ bookingRepository, fitnessClassRepository, clock }) {
    this.#bookingRepository = bookingRepository;
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#clock = clock ?? (() => new Date());
  }

  async execute({ bookingId, userId }) {
    const booking = await this.#bookingRepository.findById(bookingId);
    if (!booking || !booking.belongsTo(userId)) {
      throw new NotFoundError('booking not found');
    }
    const cls = await this.#fitnessClassRepository.findById(booking.classId);
    if (cls && cls.hasStarted(this.#clock())) {
      throw new ConflictError('cannot cancel a booking for a class that has started');
    }
    await this.#bookingRepository.delete(bookingId);
  }
}

module.exports = { CancelBooking };
