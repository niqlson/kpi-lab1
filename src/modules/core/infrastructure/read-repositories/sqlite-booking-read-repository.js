const { BookingReadRepository } = require('../../application/queries/ports/booking-read-repository');

// One JOIN replaces lab 2's "load bookings, then fetch class for each" N+1.
const SELECT = `
  SELECT
    b.id, b.user_id, b.class_id, b.created_at,
    c.title       AS class_title,
    c.instructor  AS class_instructor,
    c.starts_at   AS class_starts_at,
    c.ends_at     AS class_ends_at
  FROM bookings b
  JOIN fitness_classes c ON c.id = b.class_id
`;

function rowToReadModel(row) {
  return {
    id: row.id,
    userId: row.user_id,
    classId: row.class_id,
    createdAt: row.created_at,
    class: {
      id: row.class_id,
      title: row.class_title,
      instructor: row.class_instructor,
      startsAt: row.class_starts_at,
      endsAt: row.class_ends_at,
    },
  };
}

class SqliteBookingReadRepository extends BookingReadRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async findByUser(userId) {
    const rows = this.#db
      .prepare(`${SELECT} WHERE b.user_id = ? ORDER BY c.starts_at ASC`)
      .all(userId);
    return rows.map(rowToReadModel);
  }
}

module.exports = { SqliteBookingReadRepository };
