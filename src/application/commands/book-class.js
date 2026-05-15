const { BookingCreated } = require('../../messaging/events/booking-created');

class BookClassCommand {
  constructor({ userId, classId }) {
    this.userId = userId;
    this.classId = classId;
  }
}

class BookClassHandler {
  #bookingFactory;
  #bookingRepository;
  #userRepository;
  #fitnessClassRepository;
  #eventBus;

  constructor({ bookingFactory, bookingRepository, userRepository, fitnessClassRepository, eventBus }) {
    this.#bookingFactory = bookingFactory;
    this.#bookingRepository = bookingRepository;
    this.#userRepository = userRepository;
    this.#fitnessClassRepository = fitnessClassRepository;
    this.#eventBus = eventBus;
  }

  async handle(command) {
    const booking = await this.#bookingFactory.create({
      userId: command.userId,
      classId: command.classId,
    });
    await this.#bookingRepository.save(booking);

    if (this.#eventBus) {
      // Enrich the event so subscribers can act without further queries.
      const [user, cls] = await Promise.all([
        this.#userRepository.findById(command.userId),
        this.#fitnessClassRepository.findById(command.classId),
      ]);
      const result = this.#eventBus.publish(new BookingCreated({
        bookingId: booking.id,
        userId: user.id,
        email: user.email.value,
        name: user.name,
        classId: cls.id,
        classTitle: cls.title,
        startsAt: cls.timeSlot.start.toISOString(),
        occurredAt: new Date().toISOString(),
      }));
      if (result && typeof result.then === 'function') await result;
    }

    return { id: booking.id };
  }
}

module.exports = { BookClassCommand, BookClassHandler };
