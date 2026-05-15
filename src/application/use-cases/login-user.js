const { ValidationError, NotFoundError } = require('../../domain/errors');

class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

class LoginUser {
  #userRepository;
  #passwordHasher;
  #tokenService;

  constructor({ userRepository, passwordHasher, tokenService }) {
    this.#userRepository = userRepository;
    this.#passwordHasher = passwordHasher;
    this.#tokenService = tokenService;
  }

  async execute({ email, password }) {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidationError('email required');
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new ValidationError('password required');
    }

    const user = await this.#userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new InvalidCredentialsError();
    }
    const ok = await this.#passwordHasher.verify(password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError();
    }

    const token = this.#tokenService.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
    return { user, token };
  }
}

module.exports = { LoginUser, InvalidCredentialsError };
