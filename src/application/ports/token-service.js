class TokenService {
  sign(_payload) { throw new Error('TokenService.sign not implemented'); }
  verify(_token) { throw new Error('TokenService.verify not implemented'); }
}

module.exports = { TokenService };
