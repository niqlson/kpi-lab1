const { ValidationError } = require('../../domain/errors');
const { UserRegistered } = require('../../events/user-registered');

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
  #eventBus;

  constructor({ userFactory, userRepository, passwordHasher, tokenService, eventBus }) {
    this.#userFactory = userFactory;
    this.#userRepository = userRepository;
    this.#passwordHasher = passwordHasher;
    this.#tokenService = tokenService;
    this.#eventBus = eventBus;
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

    // Publish AFTER successful save. The handler doesn't know who subscribes —
    // it just announces a fact.
    if (this.#eventBus) {
      const result = this.#eventBus.publish(new UserRegistered({
        userId: user.id,
        email: user.email.value,
        name: user.name,
        occurredAt: new Date().toISOString(),
      }));
      // SyncEventBus.publish returns a Promise; AsyncEventBus.publish returns void.
      // Awaiting a non-Promise is harmless — this lets one handler work in both modes.
      if (result && typeof result.then === 'function') await result;
    }

    return { userId: user.id, token };
  }
}

module.exports = { RegisterUserCommand, RegisterUserHandler };
