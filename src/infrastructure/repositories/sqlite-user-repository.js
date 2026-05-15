const { UserRepository } = require('../../domain/repositories/user-repository');
const { UserMapper } = require('../mappers/user-mapper');

class SqliteUserRepository extends UserRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(user) {
    const row = UserMapper.toRow(user);
    this.#db
      .prepare(`
        INSERT INTO users (id, email, password_hash, name, role, created_at)
        VALUES (@id, @email, @password_hash, @name, @role, @created_at)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          password_hash = excluded.password_hash,
          name = excluded.name,
          role = excluded.role
      `)
      .run(row);
  }

  async findById(id) {
    const row = this.#db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email) {
    const value = typeof email === 'string' ? email : email.value;
    const row = this.#db.prepare('SELECT * FROM users WHERE email = ?').get(value);
    return row ? UserMapper.toDomain(row) : null;
  }
}

module.exports = { SqliteUserRepository };
