const { NotFoundError, ValidationError } = require('../../domain/errors');
const { TimeSlot } = require('../../domain/value-objects/time-slot');

class UpdateFitnessClass {
  #fitnessClassRepository;
  #bookingRepository;

  constructor({ fitnessClassRepository, bookingRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#bookingRepository = bookingRepository;
  }

  async execute({ classId, title, description, instructor, startsAt, endsAt, capacity }) {
    const cls = await this.#fitnessClassRepository.findById(classId);
    if (!cls) {
      throw new NotFoundError('class not found');
    }

    if (title !== undefined) cls.rename(title);
    if (instructor !== undefined) cls.changeInstructor(instructor);
    if (description !== undefined) cls.updateDescription(description);

    if (startsAt !== undefined || endsAt !== undefined) {
      const start = UpdateFitnessClass.#toDate(startsAt ?? cls.timeSlot.start.toISOString(), 'startsAt');
      const end = UpdateFitnessClass.#toDate(endsAt ?? cls.timeSlot.end.toISOString(), 'endsAt');
      cls.reschedule(new TimeSlot(start, end));
    }

    if (capacity !== undefined) {
      const currentBookings = await this.#bookingRepository.countByClass(classId);
      cls.changeCapacity(capacity, currentBookings);
    }

    await this.#fitnessClassRepository.save(cls);
    return cls;
  }

  static #toDate(value, fieldName) {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a valid ISO date string`);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid ISO date string`);
    }
    return d;
  }
}

module.exports = { UpdateFitnessClass };
