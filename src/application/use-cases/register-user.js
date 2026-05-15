const { ValidationError } = require('../../domain/errors');

class RegisterUser {
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

  async execute({ email, password, name }) {
    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('password must be at least 8 characters');
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('name must be a non-empty string');
    }

    const passwordHash = await this.#passwordHasher.hash(password);
    const user = await this.#userFactory.create({ email, name, passwordHash });
    await this.#userRepository.save(user);

    const token = this.#tokenService.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });
    return { user, token };
  }
}

module.exports = { RegisterUser };
