const { FitnessClassRepository } = require('../../domain/repositories/fitness-class-repository');
const { FitnessClassMapper } = require('../mappers/fitness-class-mapper');

class SqliteFitnessClassRepository extends FitnessClassRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(fitnessClass) {
    const row = FitnessClassMapper.toRow(fitnessClass);
    this.#db
      .prepare(`
        INSERT INTO fitness_classes
          (id, title, description, instructor, starts_at, ends_at, capacity, created_at)
        VALUES
          (@id, @title, @description, @instructor, @starts_at, @ends_at, @capacity, @created_at)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          instructor = excluded.instructor,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          capacity = excluded.capacity
      `)
      .run(row);
  }

  async findById(id) {
    const row = this.#db.prepare('SELECT * FROM fitness_classes WHERE id = ?').get(id);
    return row ? FitnessClassMapper.toDomain(row) : null;
  }

  async findAllUpcoming(now = new Date()) {
    const rows = this.#db
      .prepare('SELECT * FROM fitness_classes WHERE starts_at > ? ORDER BY starts_at ASC')
      .all(now.toISOString());
    return rows.map((row) => FitnessClassMapper.toDomain(row));
  }

  async delete(id) {
    this.#db.prepare('DELETE FROM fitness_classes WHERE id = ?').run(id);
  }
}

module.exports = { SqliteFitnessClassRepository };
