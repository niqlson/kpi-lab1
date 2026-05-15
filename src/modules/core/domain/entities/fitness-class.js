const { ValidationError, ConflictError } = require('../errors');
const { TimeSlot } = require('../value-objects/time-slot');

class FitnessClass {
  #id;
  #title;
  #description;
  #instructor;
  #timeSlot;
  #capacity;
  #createdAt;

  constructor({ id, title, description, instructor, timeSlot, capacity, createdAt }) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('class id required');
    }
    FitnessClass.#validateTitle(title);
    FitnessClass.#validateInstructor(instructor);
    FitnessClass.#validateCapacity(capacity);
    if (!(timeSlot instanceof TimeSlot)) {
      throw new ValidationError('timeSlot must be a TimeSlot value object');
    }
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      throw new ValidationError('createdAt must be a valid Date');
    }
    this.#id = id;
    this.#title = title.trim();
    this.#description = (description ?? '').toString();
    this.#instructor = instructor.trim();
    this.#timeSlot = timeSlot;
    this.#capacity = capacity;
    this.#createdAt = createdAt;
  }

  get id() { return this.#id; }
  get title() { return this.#title; }
  get description() { return this.#description; }
  get instructor() { return this.#instructor; }
  get timeSlot() { return this.#timeSlot; }
  get capacity() { return this.#capacity; }
  get createdAt() { return new Date(this.#createdAt.getTime()); }

  hasStarted(now = new Date()) {
    return this.#timeSlot.hasStarted(now);
  }

  ensureCanAcceptBooking(currentBookingsCount, now = new Date()) {
    if (this.hasStarted(now)) {
      throw new ConflictError('class has already started');
    }
    if (currentBookingsCount >= this.#capacity) {
      throw new ConflictError('class is full');
    }
  }

  rename(newTitle) {
    FitnessClass.#validateTitle(newTitle);
    this.#title = newTitle.trim();
  }

  changeInstructor(newInstructor) {
    FitnessClass.#validateInstructor(newInstructor);
    this.#instructor = newInstructor.trim();
  }

  updateDescription(newDescription) {
    this.#description = (newDescription ?? '').toString();
  }

  reschedule(newTimeSlot, now = new Date()) {
    if (!(newTimeSlot instanceof TimeSlot)) {
      throw new ValidationError('timeSlot must be a TimeSlot value object');
    }
    if (newTimeSlot.hasStarted(now)) {
      throw new ValidationError('cannot reschedule to a time in the past');
    }
    this.#timeSlot = newTimeSlot;
  }

  changeCapacity(newCapacity, currentBookingsCount) {
    FitnessClass.#validateCapacity(newCapacity);
    if (newCapacity < currentBookingsCount) {
      throw new ConflictError(
        `cannot lower capacity below current bookings count (${currentBookingsCount})`
      );
    }
    this.#capacity = newCapacity;
  }

  equals(other) {
    return other instanceof FitnessClass && other.#id === this.#id;
  }

  static #validateTitle(title) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('title must be a non-empty string');
    }
  }

  static #validateInstructor(instructor) {
    if (typeof instructor !== 'string' || instructor.trim().length === 0) {
      throw new ValidationError('instructor must be a non-empty string');
    }
  }

  static #validateCapacity(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new ValidationError('capacity must be a positive integer');
    }
  }
}

module.exports = { FitnessClass };
