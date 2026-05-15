class ListMyBookings {
  #bookingRepository;
  #fitnessClassRepository;

  constructor({ bookingRepository, fitnessClassRepository }) {
    this.#bookingRepository = bookingRepository;
    this.#fitnessClassRepository = fitnessClassRepository;
  }

  async execute({ userId }) {
    const bookings = await this.#bookingRepository.findByUser(userId);
    const items = await Promise.all(
      bookings.map(async (booking) => {
        const cls = await this.#fitnessClassRepository.findById(booking.classId);
        return { booking, fitnessClass: cls };
      })
    );
    return items;
  }
}

module.exports = { ListMyBookings };
