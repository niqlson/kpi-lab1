const { MetricRepository } = require('../../domain/repositories/metric-repository');

class SqliteMetricRepository extends MetricRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async saveBookingMetric(m) {
    this.#db.prepare(`
      INSERT OR IGNORE INTO analytics_booking_metrics
        (id, actor_id, resource_id, resource_title, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(m.id, m.actorId, m.resourceId, m.resourceTitle, m.recordedAt);
  }

  async saveCancellationMetric(m) {
    this.#db.prepare(`
      INSERT OR IGNORE INTO analytics_cancellation_metrics
        (id, actor_id, resource_id, resource_title, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(m.id, m.actorId, m.resourceId, m.resourceTitle, m.recordedAt);
  }

  async saveRegistrationMetric(m) {
    this.#db.prepare(`
      INSERT OR IGNORE INTO analytics_registration_metrics
        (id, actor_id, registered_at)
      VALUES (?, ?, ?)
    `).run(m.id, m.actorId, m.registeredAt);
  }

  async hasBookingMetric(eventId) {
    return Boolean(
      this.#db.prepare('SELECT 1 FROM analytics_booking_metrics WHERE id = ?').get(eventId)
    );
  }

  async hasCancellationMetric(eventId) {
    return Boolean(
      this.#db.prepare('SELECT 1 FROM analytics_cancellation_metrics WHERE id = ?').get(eventId)
    );
  }

  async hasRegistrationMetric(eventId) {
    return Boolean(
      this.#db.prepare('SELECT 1 FROM analytics_registration_metrics WHERE id = ?').get(eventId)
    );
  }
}

module.exports = { SqliteMetricRepository };
