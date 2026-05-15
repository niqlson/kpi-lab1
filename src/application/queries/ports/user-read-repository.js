// Read-side port. Returns Read Models (plain objects), not domain entities.
// Lives in the application layer per the Repository lecture's CQS section.
class UserReadRepository {
  async findById(_id) { throw new Error('UserReadRepository.findById not implemented'); }
}

module.exports = { UserReadRepository };
