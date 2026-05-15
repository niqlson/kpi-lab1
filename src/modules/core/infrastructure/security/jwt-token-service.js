const jwt = require('jsonwebtoken');
const { TokenService } = require('../../application/ports/token-service');

class JwtTokenService extends TokenService {
  #secret;
  #expiresIn;

  constructor({ secret, expiresIn = '7d' }) {
    super();
    if (!secret) throw new Error('JwtTokenService requires a secret');
    this.#secret = secret;
    this.#expiresIn = expiresIn;
  }

  sign(payload) {
    return jwt.sign(payload, this.#secret, { expiresIn: this.#expiresIn });
  }

  verify(token) {
    try {
      return jwt.verify(token, this.#secret);
    } catch {
      return null;
    }
  }
}

module.exports = { JwtTokenService };
