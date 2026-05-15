const { NotFoundError, ValidationError } = require('../../domain/errors');
const { TimeSlot } = require('../../domain/value-objects/time-slot');

function toDate(value, fieldName) {
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

class UpdateFitnessClassCommand {
  constructor({ classId, title, description, instructor, startsAt, endsAt, capacity }) {
    this.classId = classId;
    this.title = title;
    this.description = description;
    this.instructor = instructor;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.capacity = capacity;
  }
}

class UpdateFitnessClassHandler {
  #fitnessClassRepository;
  #bookingRepository;

  constructor({ fitnessClassRepository, bookingRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#bookingRepository = bookingRepository;
  }

  async handle(command) {
    const cls = await this.#fitnessClassRepository.findById(command.classId);
    if (!cls) throw new NotFoundError('class not found');

    if (command.title !== undefined) cls.rename(command.title);
    if (command.instructor !== undefined) cls.changeInstructor(command.instructor);
    if (command.description !== undefined) cls.updateDescription(command.description);

    if (command.startsAt !== undefined || command.endsAt !== undefined) {
      const start = toDate(command.startsAt ?? cls.timeSlot.start.toISOString(), 'startsAt');
      const end = toDate(command.endsAt ?? cls.timeSlot.end.toISOString(), 'endsAt');
      cls.reschedule(new TimeSlot(start, end));
    }

    if (command.capacity !== undefined) {
      const currentBookings = await this.#bookingRepository.countByClass(command.classId);
      cls.changeCapacity(command.capacity, currentBookings);
    }

    await this.#fitnessClassRepository.save(cls);
    return { id: cls.id };
  }
}

module.exports = { UpdateFitnessClassCommand, UpdateFitnessClassHandler };
