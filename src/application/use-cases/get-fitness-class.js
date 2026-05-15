const { NotFoundError } = require('../../domain/errors');

class GetFitnessClass {
  #fitnessClassRepository;

  constructor({ fitnessClassRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async execute({ classId }) {
    const cls = await this.#fitnessClassRepository.findById(classId);
    if (!cls) {
      throw new NotFoundError('class not found');
    }
    return cls;
  }
}

module.exports = { GetFitnessClass };
