const crypto = require('node:crypto');
const { NotFoundError, ConflictError, ValidationError } = require('../errors');
const { Booking } = require('../entities/booking');

class BookingFactory {
  #fitnessClassRepository;
  #bookingRepository;
  #clock;
  #idGenerator;

  constructor({ fitnessClassRepository, bookingRepository, clock, idGenerator } = {}) {
    if (!fitnessClassRepository) {
      throw new Error('BookingFactory requires a fitnessClassRepository');
    }
    if (!bookingRepository) {
      throw new Error('BookingFactory requires a bookingRepository');
    }
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#bookingRepository = bookingRepository;
    this.#clock = clock ?? (() => new Date());
    this.#idGenerator = idGenerator ?? (() => crypto.randomUUID());
  }

  async create({ userId, classId }) {
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('userId required');
    }
    if (typeof classId !== 'string' || classId.length === 0) {
      throw new ValidationError('classId required');
    }

    const cls = await this.#fitnessClassRepository.findById(classId);
    if (!cls) {
      throw new NotFoundError('class not found');
    }

    const duplicate = await this.#bookingRepository.findByUserAndClass(userId, classId);
    if (duplicate) {
      throw new ConflictError('already booked this class');
    }

    const currentCount = await this.#bookingRepository.countByClass(classId);
    cls.ensureCanAcceptBooking(currentCount, this.#clock());

    return new Booking({
      id: this.#idGenerator(),
      userId,
      classId,
      createdAt: this.#clock(),
    });
  }
}

module.exports = { BookingFactory };
