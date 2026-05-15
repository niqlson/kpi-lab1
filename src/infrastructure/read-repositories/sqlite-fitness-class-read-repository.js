const { FitnessClassReadRepository } = require('../../application/queries/ports/fitness-class-read-repository');

// Denormalised: bookingsCount comes from the same SELECT, no extra trip per row.
const SELECT = `
  SELECT
    c.id, c.title, c.description, c.instructor,
    c.starts_at, c.ends_at, c.capacity, c.created_at,
    (SELECT COUNT(*) FROM bookings b WHERE b.class_id = c.id) AS bookings_count
  FROM fitness_classes c
`;

function rowToReadModel(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    instructor: row.instructor,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    bookingsCount: row.bookings_count,
    createdAt: row.created_at,
  };
}

class SqliteFitnessClassReadRepository extends FitnessClassReadRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async findUpcoming(now = new Date()) {
    const rows = this.#db
      .prepare(`${SELECT} WHERE c.starts_at > ? ORDER BY c.starts_at ASC`)
      .all(now.toISOString());
    return rows.map(rowToReadModel);
  }

  async findById(id) {
    const row = this.#db.prepare(`${SELECT} WHERE c.id = ?`).get(id);
    return row ? rowToReadModel(row) : null;
  }
}

module.exports = { SqliteFitnessClassReadRepository };
