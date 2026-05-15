class BookingRepository {
  async save(_booking) { throw new Error('BookingRepository.save not implemented'); }
  async findById(_id) { throw new Error('BookingRepository.findById not implemented'); }
  async findByUser(_userId) { throw new Error('BookingRepository.findByUser not implemented'); }
  async findByUserAndClass(_userId, _classId) { throw new Error('BookingRepository.findByUserAndClass not implemented'); }
  async countByClass(_classId) { throw new Error('BookingRepository.countByClass not implemented'); }
  async delete(_id) { throw new Error('BookingRepository.delete not implemented'); }
}

module.exports = { BookingRepository };
