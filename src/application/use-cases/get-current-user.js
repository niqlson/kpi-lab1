const { NotFoundError } = require('../../domain/errors');

class GetCurrentUser {
  #userRepository;

  constructor({ userRepository }) {
    this.#userRepository = userRepository;
  }

  async execute({ userId }) {
    const user = await this.#userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('user not found');
    }
    return user;
  }
}

module.exports = { GetCurrentUser };
