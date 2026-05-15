const { NotFoundError } = require('../../domain/errors');

class GetFitnessClassQuery {
  constructor({ classId }) {
    this.classId = classId;
  }
}

class GetFitnessClassHandler {
  #fitnessClassReadRepository;

  constructor({ fitnessClassReadRepository }) {
    this.#fitnessClassReadRepository = fitnessClassReadRepository;
  }

  async handle(query) {
    const cls = await this.#fitnessClassReadRepository.findById(query.classId);
    if (!cls) throw new NotFoundError('class not found');
    return cls;
  }
}

module.exports = { GetFitnessClassQuery, GetFitnessClassHandler };
