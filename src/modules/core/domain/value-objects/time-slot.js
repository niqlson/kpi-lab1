const { ValidationError } = require('../errors');

class TimeSlot {
  #start;
  #end;

  constructor(start, end) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new ValidationError('start must be a valid Date');
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new ValidationError('end must be a valid Date');
    }
    if (end <= start) {
      throw new ValidationError('end must be strictly after start');
    }
    this.#start = new Date(start.getTime());
    this.#end = new Date(end.getTime());
  }

  get start() {
    return new Date(this.#start.getTime());
  }

  get end() {
    return new Date(this.#end.getTime());
  }

  durationMinutes() {
    return Math.round((this.#end.getTime() - this.#start.getTime()) / 60_000);
  }

  isInPast(now = new Date()) {
    return this.#end < now;
  }

  hasStarted(now = new Date()) {
    return this.#start <= now;
  }

  overlaps(other) {
    if (!(other instanceof TimeSlot)) {
      throw new ValidationError('overlaps expects a TimeSlot');
    }
    return this.#start < other.#end && other.#start < this.#end;
  }

  equals(other) {
    return (
      other instanceof TimeSlot &&
      this.#start.getTime() === other.#start.getTime() &&
      this.#end.getTime() === other.#end.getTime()
    );
  }
}

module.exports = { TimeSlot };
