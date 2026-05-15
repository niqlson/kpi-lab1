class UserRepository {
  async save(_user) { throw new Error('UserRepository.save not implemented'); }
  async findById(_id) { throw new Error('UserRepository.findById not implemented'); }
  async findByEmail(_email) { throw new Error('UserRepository.findByEmail not implemented'); }
}

module.exports = { UserRepository };
