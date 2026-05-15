const { ValidationError } = require('../errors');

class Booking {
  #id;
  #userId;
  #classId;
  #createdAt;

  constructor({ id, userId, classId, createdAt }) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('booking id required');
    }
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new ValidationError('booking userId required');
    }
    if (typeof classId !== 'string' || classId.length === 0) {
      throw new ValidationError('booking classId required');
    }
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      throw new ValidationError('booking createdAt must be a valid Date');
    }
    this.#id = id;
    this.#userId = userId;
    this.#classId = classId;
    this.#createdAt = createdAt;
  }

  get id() { return this.#id; }
  get userId() { return this.#userId; }
  get classId() { return this.#classId; }
  get createdAt() { return new Date(this.#createdAt.getTime()); }

  belongsTo(userId) {
    return this.#userId === userId;
  }

  equals(other) {
    return other instanceof Booking && other.#id === this.#id;
  }
}

module.exports = { Booking };
