class ListFitnessClasses {
  #fitnessClassRepository;

  constructor({ fitnessClassRepository }) {
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async execute() {
    return this.#fitnessClassRepository.findAllUpcoming(new Date());
  }
}

module.exports = { ListFitnessClasses };
