const { ValidationError } = require('../errors');
const { Email } = require('../value-objects/email');

const VALID_ROLES = new Set(['client', 'admin']);

class User {
  #id;
  #email;
  #name;
  #role;
  #passwordHash;
  #createdAt;

  constructor({ id, email, name, role, passwordHash, createdAt }) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('user id required');
    }
    if (!(email instanceof Email)) {
      throw new ValidationError('user email must be an Email value object');
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('user name must be a non-empty string');
    }
    if (!VALID_ROLES.has(role)) {
      throw new ValidationError(`user role must be one of ${[...VALID_ROLES].join(', ')}`);
    }
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new ValidationError('user must have a passwordHash');
    }
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      throw new ValidationError('user createdAt must be a valid Date');
    }
    this.#id = id;
    this.#email = email;
    this.#name = name.trim();
    this.#role = role;
    this.#passwordHash = passwordHash;
    this.#createdAt = createdAt;
  }

  get id() { return this.#id; }
  get email() { return this.#email; }
  get name() { return this.#name; }
  get role() { return this.#role; }
  get passwordHash() { return this.#passwordHash; }
  get createdAt() { return new Date(this.#createdAt.getTime()); }

  isAdmin() {
    return this.#role === 'admin';
  }

  equals(other) {
    return other instanceof User && other.#id === this.#id;
  }
}

module.exports = { User };
