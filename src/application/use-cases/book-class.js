class BookClass {
  #bookingFactory;
  #bookingRepository;

  constructor({ bookingFactory, bookingRepository }) {
    this.#bookingFactory = bookingFactory;
    this.#bookingRepository = bookingRepository;
  }

  async execute({ userId, classId }) {
    const booking = await this.#bookingFactory.create({ userId, classId });
    await this.#bookingRepository.save(booking);
    return booking;
  }
}

module.exports = { BookClass };
