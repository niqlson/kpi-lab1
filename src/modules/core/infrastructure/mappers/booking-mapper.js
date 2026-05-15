const { Booking } = require('../../domain/entities/booking');

class BookingMapper {
  static toDomain(row) {
    return new Booking({
      id: row.id,
      userId: row.user_id,
      classId: row.class_id,
      createdAt: new Date(row.created_at),
    });
  }

  static toRow(booking) {
    return {
      id: booking.id,
      user_id: booking.userId,
      class_id: booking.classId,
      created_at: booking.createdAt.toISOString(),
    };
  }
}

module.exports = { BookingMapper };
