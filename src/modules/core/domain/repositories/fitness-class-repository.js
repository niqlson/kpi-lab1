class FitnessClassRepository {
  async save(_fitnessClass) { throw new Error('FitnessClassRepository.save not implemented'); }
  async findById(_id) { throw new Error('FitnessClassRepository.findById not implemented'); }
  async findAllUpcoming(_now) { throw new Error('FitnessClassRepository.findAllUpcoming not implemented'); }
  async delete(_id) { throw new Error('FitnessClassRepository.delete not implemented'); }
}

module.exports = { FitnessClassRepository };
