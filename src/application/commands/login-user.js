const { ValidationError } = require('../../domain/errors');

class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

class LoginUserCommand {
  constructor({ email, password }) {
    this.email = email;
    this.password = password;
  }
}

class LoginUserHandler {
  #userRepository;
  #passwordHasher;
  #tokenService;

  constructor({ userRepository, passwordHasher, tokenService }) {
    this.#userRepository = userRepository;
    this.#passwordHasher = passwordHasher;
    this.#tokenService = tokenService;
  }

  async handle(command) {
    if (typeof command.email !== 'string' || command.email.trim().length === 0) {
      throw new ValidationError('email required');
    }
    if (typeof command.password !== 'string' || command.password.length === 0) {
      throw new ValidationError('password required');
    }
    const user = await this.#userRepository.findByEmail(command.email.toLowerCase());
    if (!user) throw new InvalidCredentialsError();
    const ok = await this.#passwordHasher.verify(command.password, user.passwordHash);
    if (!ok) throw new InvalidCredentialsError();
    const token = this.#tokenService.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
    return { userId: user.id, token };
  }
}

module.exports = { LoginUserCommand, LoginUserHandler, InvalidCredentialsError };
