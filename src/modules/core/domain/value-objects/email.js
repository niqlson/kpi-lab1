const { ValidationError } = require('../errors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Email {
  #value;

  constructor(value) {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      throw new ValidationError('email is invalid');
    }
    this.#value = value.toLowerCase();
  }

  get value() {
    return this.#value;
  }

  domain() {
    return this.#value.split('@')[1];
  }

  equals(other) {
    return other instanceof Email && other.#value === this.#value;
  }

  toString() {
    return this.#value;
  }
}

module.exports = { Email };
