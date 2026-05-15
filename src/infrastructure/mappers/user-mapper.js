const { User } = require('../../domain/entities/user');
const { Email } = require('../../domain/value-objects/email');

class UserMapper {
  static toDomain(row) {
    return new User({
      id: row.id,
      email: new Email(row.email),
      name: row.name,
      role: row.role,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(user) {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      role: user.role,
      password_hash: user.passwordHash,
      created_at: user.createdAt.toISOString(),
    };
  }
}

module.exports = { UserMapper };
