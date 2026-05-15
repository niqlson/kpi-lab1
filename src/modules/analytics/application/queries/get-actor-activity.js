class GetActorActivityQuery {
  constructor({ actorId }) { this.actorId = actorId; }
}

class GetActorActivityHandler {
  #projectionsReadRepository;

  constructor({ projectionsReadRepository }) {
    this.#projectionsReadRepository = projectionsReadRepository;
  }

  async handle(query) {
    return this.#projectionsReadRepository.getActorActivity(query.actorId);
  }
}

module.exports = { GetActorActivityQuery, GetActorActivityHandler };
