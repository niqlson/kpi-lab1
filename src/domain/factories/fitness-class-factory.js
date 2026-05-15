const crypto = require('node:crypto');
const { ValidationError } = require('../errors');
const { TimeSlot } = require('../value-objects/time-slot');
const { FitnessClass } = require('../entities/fitness-class');

class FitnessClassFactory {
  #clock;
  #idGenerator;

  constructor({ clock, idGenerator } = {}) {
    this.#clock = clock ?? (() => new Date());
    this.#idGenerator = idGenerator ?? (() => crypto.randomUUID());
  }

  create({ title, description, instructor, startsAt, endsAt, capacity }) {
    const start = FitnessClassFactory.#toDate(startsAt, 'startsAt');
    const end = FitnessClassFactory.#toDate(endsAt, 'endsAt');
    const timeSlot = new TimeSlot(start, end);

    if (timeSlot.hasStarted(this.#clock())) {
      throw new ValidationError('startsAt must be in the future');
    }

    return new FitnessClass({
      id: this.#idGenerator(),
      title,
      description,
      instructor,
      timeSlot,
      capacity,
      createdAt: this.#clock(),
    });
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

module.exports = { FitnessClassFactory };
