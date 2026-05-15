const crypto = require('node:crypto');

class BookingCancelled {
  constructor({ bookingId, userId, email, name, classId, classTitle, occurredAt }) {
    this.eventId = crypto.randomUUID();
    this.eventName = 'BookingCancelled';
    this.bookingId = bookingId;
    this.userId = userId;
    this.email = email;
    this.name = name;
    this.classId = classId;
    this.classTitle = classTitle;
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}

module.exports = { BookingCancelled };
