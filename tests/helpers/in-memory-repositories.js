const { UserRepository } = require('../../src/domain/repositories/user-repository');
const { FitnessClassRepository } = require('../../src/domain/repositories/fitness-class-repository');
const { BookingRepository } = require('../../src/domain/repositories/booking-repository');

class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
  }
  async save(user) { this.users.set(user.id, user); }
  async findById(id) { return this.users.get(id) ?? null; }
  async findByEmail(email) {
    const value = typeof email === 'string' ? email.toLowerCase() : email.value;
    for (const u of this.users.values()) if (u.email.value === value) return u;
    return null;
  }
}

class InMemoryFitnessClassRepository extends FitnessClassRepository {
  constructor() {
    super();
    this.classes = new Map();
  }
  async save(cls) { this.classes.set(cls.id, cls); }
  async findById(id) { return this.classes.get(id) ?? null; }
  async findAllUpcoming(now = new Date()) {
    return [...this.classes.values()]
      .filter((c) => c.timeSlot.start > now)
      .sort((a, b) => a.timeSlot.start - b.timeSlot.start);
  }
  async delete(id) { this.classes.delete(id); }
}

class InMemoryBookingRepository extends BookingRepository {
  constructor() {
    super();
    this.bookings = new Map();
  }
  async save(b) { this.bookings.set(b.id, b); }
  async findById(id) { return this.bookings.get(id) ?? null; }
  async findByUser(userId) {
    return [...this.bookings.values()].filter((b) => b.userId === userId);
  }
  async findByUserAndClass(userId, classId) {
    for (const b of this.bookings.values()) {
      if (b.userId === userId && b.classId === classId) return b;
    }
    return null;
  }
  async countByClass(classId) {
    let c = 0;
    for (const b of this.bookings.values()) if (b.classId === classId) c += 1;
    return c;
  }
  async delete(id) { this.bookings.delete(id); }
}

module.exports = {
  InMemoryUserRepository,
  InMemoryFitnessClassRepository,
  InMemoryBookingRepository,
};
