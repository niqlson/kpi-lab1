class CreateFitnessClass {
  #fitnessClassFactory;
  #fitnessClassRepository;

  constructor({ fitnessClassFactory, fitnessClassRepository }) {
    this.#fitnessClassFactory = fitnessClassFactory;
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async execute(input) {
    const cls = this.#fitnessClassFactory.create(input);
    await this.#fitnessClassRepository.save(cls);
    return cls;
  }
}

module.exports = { CreateFitnessClass };
