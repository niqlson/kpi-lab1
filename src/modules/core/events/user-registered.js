const crypto = require('node:crypto');

class UserRegistered {
  constructor({ userId, email, name, occurredAt }) {
    this.eventId = crypto.randomUUID();
    this.eventName = 'UserRegistered';
    this.userId = userId;
    this.email = email;
    this.name = name;
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}

module.exports = { UserRegistered };
