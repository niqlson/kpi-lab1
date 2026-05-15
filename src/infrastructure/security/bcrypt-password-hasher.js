const bcrypt = require('bcryptjs');
const { PasswordHasher } = require('../../application/ports/password-hasher');

class BcryptPasswordHasher extends PasswordHasher {
  #rounds;

  constructor({ rounds = 10 } = {}) {
    super();
    this.#rounds = rounds;
  }

  async hash(plain) {
    return bcrypt.hash(plain, this.#rounds);
  }

  async verify(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}

module.exports = { BcryptPasswordHasher };
