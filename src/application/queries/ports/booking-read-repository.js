// Booking Read Models are denormalised with class info — what the API actually returns.
// One JOIN replaces the N+1 we had in lab 2 (load bookings, then fetch each class).
class BookingReadRepository {
  async findByUser(_userId) { throw new Error('BookingReadRepository.findByUser not implemented'); }
}

module.exports = { BookingReadRepository };
