// Read-side port — returns Read Models built by SQL aggregations
// over Analytics's own tables.
class ProjectionsReadRepository {
  async listPopularResources(_limit) { throw new Error('not implemented'); }
  async getActorActivity(_actorId) { throw new Error('not implemented'); }
}

module.exports = { ProjectionsReadRepository };
