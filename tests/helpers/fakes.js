const { PasswordHasher } = require('../../src/modules/core/application/ports/password-hasher');
const { TokenService } = require('../../src/modules/core/application/ports/token-service');

class FakePasswordHasher extends PasswordHasher {
  async hash(plain) { return `hashed:${plain}`; }
  async verify(plain, hash) { return hash === `hashed:${plain}`; }
}

class FakeTokenService extends TokenService {
  sign(payload) { return `token:${JSON.stringify(payload)}`; }
  verify(token) {
    if (typeof token !== 'string' || !token.startsWith('token:')) return null;
    try { return JSON.parse(token.slice('token:'.length)); } catch { return null; }
  }
}

function futureDate(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60_000);
}
function futureIso(minutesFromNow) {
  return futureDate(minutesFromNow).toISOString();
}

module.exports = { FakePasswordHasher, FakeTokenService, futureDate, futureIso };
