const { ValidationError } = require('../../domain/errors');

class RegisterUserCommand {
  constructor({ email, password, name }) {
    this.email = email;
    this.password = password;
    this.name = name;
  }
}

class RegisterUserHandler {
  #userFactory;
  #userRepository;
  #passwordHasher;
  #tokenService;

  constructor({ userFactory, userRepository, passwordHasher, tokenService }) {
    this.#userFactory = userFactory;
    this.#userRepository = userRepository;
    this.#passwordHasher = passwordHasher;
    this.#tokenService = tokenService;
  }

  async handle(command) {
    if (typeof command.password !== 'string' || command.password.length < 8) {
      throw new ValidationError('password must be at least 8 characters');
    }
    if (typeof command.name !== 'string' || command.name.trim().length === 0) {
      throw new ValidationError('name must be a non-empty string');
    }

    const passwordHash = await this.#passwordHasher.hash(command.password);
    const user = await this.#userFactory.create({
      email: command.email,
      name: command.name,
      passwordHash,
    });
    await this.#userRepository.save(user);
    const token = this.#tokenService.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
    return { userId: user.id, token };
  }
}

module.exports = { RegisterUserCommand, RegisterUserHandler };
