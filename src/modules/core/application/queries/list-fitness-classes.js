class ListFitnessClassesQuery {
  // No parameters today; placeholder for future filters (instructor, day-of-week, etc.)
}

class ListFitnessClassesHandler {
  #fitnessClassReadRepository;

  constructor({ fitnessClassReadRepository }) {
    this.#fitnessClassReadRepository = fitnessClassReadRepository;
  }

  async handle(_query) {
    const items = await this.#fitnessClassReadRepository.findUpcoming(new Date());
    return { items };
  }
}

module.exports = { ListFitnessClassesQuery, ListFitnessClassesHandler };
