class PasswordHasher {
  async hash(_plain) { throw new Error('PasswordHasher.hash not implemented'); }
  async verify(_plain, _hash) { throw new Error('PasswordHasher.verify not implemented'); }
}

module.exports = { PasswordHasher };
