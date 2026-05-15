// Read Models include denormalised data not present on the domain entity
// (e.g. bookingsCount), shaped for the client.
class FitnessClassReadRepository {
  async findUpcoming(_now) { throw new Error('FitnessClassReadRepository.findUpcoming not implemented'); }
  async findById(_id) { throw new Error('FitnessClassReadRepository.findById not implemented'); }
}

module.exports = { FitnessClassReadRepository };
