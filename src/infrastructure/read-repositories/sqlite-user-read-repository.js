const { UserReadRepository } = require('../../application/queries/ports/user-read-repository');

function rowToReadModel(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

class SqliteUserReadRepository extends UserReadRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async findById(id) {
    const row = this.#db
      .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
      .get(id);
    return row ? rowToReadModel(row) : null;
  }
}

module.exports = { SqliteUserReadRepository };
