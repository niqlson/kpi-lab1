const { NotFoundError } = require('../../domain/errors');

class GetCurrentUserQuery {
  constructor({ userId }) {
    this.userId = userId;
  }
}

class GetCurrentUserHandler {
  #userReadRepository;

  constructor({ userReadRepository }) {
    this.#userReadRepository = userReadRepository;
  }

  async handle(query) {
    const user = await this.#userReadRepository.findById(query.userId);
    if (!user) throw new NotFoundError('user not found');
    return user;
  }
}

module.exports = { GetCurrentUserQuery, GetCurrentUserHandler };
