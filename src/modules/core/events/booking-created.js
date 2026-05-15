const crypto = require('node:crypto');

// Past tense, immutable, self-sufficient — subscriber can act without extra queries.
class BookingCreated {
  constructor({ bookingId, userId, email, name, classId, classTitle, startsAt, occurredAt }) {
    this.eventId = crypto.randomUUID();
    this.eventName = 'BookingCreated';
    this.bookingId = bookingId;
    this.userId = userId;
    this.email = email;
    this.name = name;
    this.classId = classId;
    this.classTitle = classTitle;
    this.startsAt = startsAt;
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}

module.exports = { BookingCreated };
