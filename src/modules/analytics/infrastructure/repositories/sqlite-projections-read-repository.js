const { ProjectionsReadRepository } = require('../../application/queries/ports/projections-read-repository');

// SQL aggregations over Analytics's own tables produce Read Models.
// These are flat DTOs, shaped for the API consumer.
class SqliteProjectionsReadRepository extends ProjectionsReadRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async listPopularResources(limit = 10) {
    const rows = this.#db.prepare(`
      SELECT
        resource_id   AS resourceId,
        resource_title AS resourceTitle,
        COUNT(*)      AS bookingsTotal,
        (SELECT COUNT(*)
           FROM analytics_cancellation_metrics c
           WHERE c.resource_id = b.resource_id) AS cancellationsTotal,
        MAX(recorded_at) AS lastBookedAt
      FROM analytics_booking_metrics b
      GROUP BY resource_id, resource_title
      ORDER BY bookingsTotal DESC, lastBookedAt DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r) => ({
      resourceId: r.resourceId,
      resourceTitle: r.resourceTitle,
      bookingsTotal: r.bookingsTotal,
      cancellationsTotal: r.cancellationsTotal,
      activeBookings: r.bookingsTotal - r.cancellationsTotal,
      lastBookedAt: r.lastBookedAt,
    }));
  }

  async getActorActivity(actorId) {
    const bookingsRow = this.#db.prepare(`
      SELECT COUNT(*) AS total, MAX(recorded_at) AS lastAt
      FROM analytics_booking_metrics WHERE actor_id = ?
    `).get(actorId);

    const cancellationsRow = this.#db.prepare(`
      SELECT COUNT(*) AS total, MAX(recorded_at) AS lastAt
      FROM analytics_cancellation_metrics WHERE actor_id = ?
    `).get(actorId);

    const registrationRow = this.#db.prepare(`
      SELECT registered_at FROM analytics_registration_metrics WHERE actor_id = ?
    `).get(actorId);

    return {
      actorId,
      registeredAt: registrationRow?.registered_at ?? null,
      bookingsTotal: bookingsRow?.total ?? 0,
      cancellationsTotal: cancellationsRow?.total ?? 0,
      activeBookings: (bookingsRow?.total ?? 0) - (cancellationsRow?.total ?? 0),
      lastBookedAt: bookingsRow?.lastAt ?? null,
      lastCancelledAt: cancellationsRow?.lastAt ?? null,
    };
  }
}

module.exports = { SqliteProjectionsReadRepository };
