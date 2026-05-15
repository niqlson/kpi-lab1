class BookClassCommand {
  constructor({ userId, classId }) {
    this.userId = userId;
    this.classId = classId;
  }
}

class BookClassHandler {
  #bookingFactory;
  #bookingRepository;

  constructor({ bookingFactory, bookingRepository }) {
    this.#bookingFactory = bookingFactory;
    this.#bookingRepository = bookingRepository;
  }

  async handle(command) {
    const booking = await this.#bookingFactory.create({
      userId: command.userId,
      classId: command.classId,
    });
    await this.#bookingRepository.save(booking);
    return { id: booking.id };
  }
}

module.exports = { BookClassCommand, BookClassHandler };
