const crypto = require('node:crypto');
const { ConflictError, ValidationError } = require('../errors');
const { Email } = require('../value-objects/email');
const { User } = require('../entities/user');

class UserFactory {
  #userRepository;
  #clock;
  #idGenerator;

  constructor({ userRepository, clock, idGenerator } = {}) {
    if (!userRepository) {
      throw new Error('UserFactory requires a userRepository');
    }
    this.#userRepository = userRepository;
    this.#clock = clock ?? (() => new Date());
    this.#idGenerator = idGenerator ?? (() => crypto.randomUUID());
  }

  async create({ email, name, passwordHash, role = 'client' }) {
    const emailVo = new Email(email);
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new ValidationError('passwordHash required');
    }

    const existing = await this.#userRepository.findByEmail(emailVo);
    if (existing) {
      throw new ConflictError('email already registered');
    }

    return new User({
      id: this.#idGenerator(),
      email: emailVo,
      name,
      role,
      passwordHash,
      createdAt: this.#clock(),
    });
  }
}

module.exports = { UserFactory };
