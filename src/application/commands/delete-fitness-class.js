const { NotFoundError } = require('../../domain/errors');

class DeleteFitnessClassCommand {
  constructor({ classId }) {
    this.classId = classId;
  }
}

class DeleteFitnessClassHandler {
  #fitnessClassRepository;

  constructor({ fitnessClassRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async handle(command) {
    const cls = await this.#fitnessClassRepository.findById(command.classId);
    if (!cls) throw new NotFoundError('class not found');
    await this.#fitnessClassRepository.delete(command.classId);
  }
}

module.exports = { DeleteFitnessClassCommand, DeleteFitnessClassHandler };
