class ListPopularResourcesQuery {
  constructor({ limit = 10 } = {}) { this.limit = limit; }
}

class ListPopularResourcesHandler {
  #projectionsReadRepository;

  constructor({ projectionsReadRepository }) {
    this.#projectionsReadRepository = projectionsReadRepository;
  }

  async handle(query) {
    const items = await this.#projectionsReadRepository.listPopularResources(query.limit);
    return { items };
  }
}

module.exports = { ListPopularResourcesQuery, ListPopularResourcesHandler };
