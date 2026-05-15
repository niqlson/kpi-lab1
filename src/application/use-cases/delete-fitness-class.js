const { NotFoundError } = require('../../domain/errors');

class DeleteFitnessClass {
  #fitnessClassRepository;

  constructor({ fitnessClassRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async execute({ classId }) {
    const cls = await this.#fitnessClassRepository.findById(classId);
    if (!cls) {
      throw new NotFoundError('class not found');
    }
    await this.#fitnessClassRepository.delete(classId);
  }
}

module.exports = { DeleteFitnessClass };
