class ListMyBookingsQuery {
  constructor({ userId }) {
    this.userId = userId;
  }
}

class ListMyBookingsHandler {
  #bookingReadRepository;

  constructor({ bookingReadRepository }) {
    this.#bookingReadRepository = bookingReadRepository;
  }

  async handle(query) {
    const items = await this.#bookingReadRepository.findByUser(query.userId);
    return { items };
  }
}

module.exports = { ListMyBookingsQuery, ListMyBookingsHandler };
