class CreateFitnessClassCommand {
  constructor({ title, description, instructor, startsAt, endsAt, capacity }) {
    this.title = title;
    this.description = description;
    this.instructor = instructor;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.capacity = capacity;
  }
}

class CreateFitnessClassHandler {
  #fitnessClassFactory;
  #fitnessClassRepository;

  constructor({ fitnessClassFactory, fitnessClassRepository }) {
    this.#fitnessClassFactory = fitnessClassFactory;
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async handle(command) {
    const cls = this.#fitnessClassFactory.create({
      title: command.title,
      description: command.description,
      instructor: command.instructor,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      capacity: command.capacity,
    });
    await this.#fitnessClassRepository.save(cls);
    return { id: cls.id };
  }
}

module.exports = { CreateFitnessClassCommand, CreateFitnessClassHandler };
