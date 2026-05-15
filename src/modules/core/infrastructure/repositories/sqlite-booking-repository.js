const { BookingRepository } = require('../../domain/repositories/booking-repository');
const { BookingMapper } = require('../mappers/booking-mapper');

class SqliteBookingRepository extends BookingRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(booking) {
    const row = BookingMapper.toRow(booking);
    this.#db
      .prepare(`
        INSERT INTO bookings (id, user_id, class_id, created_at)
        VALUES (@id, @user_id, @class_id, @created_at)
      `)
      .run(row);
  }

  async findById(id) {
    const row = this.#db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return row ? BookingMapper.toDomain(row) : null;
  }

  async findByUser(userId) {
    const rows = this.#db
      .prepare(`
        SELECT b.*
        FROM bookings b
        JOIN fitness_classes c ON c.id = b.class_id
        WHERE b.user_id = ?
        ORDER BY c.starts_at ASC
      `)
      .all(userId);
    return rows.map((row) => BookingMapper.toDomain(row));
  }

  async findByUserAndClass(userId, classId) {
    const row = this.#db
      .prepare('SELECT * FROM bookings WHERE user_id = ? AND class_id = ?')
      .get(userId, classId);
    return row ? BookingMapper.toDomain(row) : null;
  }

  async countByClass(classId) {
    const result = this.#db
      .prepare('SELECT COUNT(*) AS c FROM bookings WHERE class_id = ?')
      .get(classId);
    return result.c;
  }

  async delete(id) {
    this.#db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
  }
}

module.exports = { SqliteBookingRepository };
