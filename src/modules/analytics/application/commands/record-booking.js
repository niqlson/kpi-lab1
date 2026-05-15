// Internal command — not exposed via HTTP. Triggered by the events subscriber.
class RecordBookingCommand {
  constructor({ metric }) { this.metric = metric; }
}

class RecordBookingHandler {
  #metricRepository;

  constructor({ metricRepository }) {
    this.#metricRepository = metricRepository;
  }

  async handle(command) {
    // Idempotency: same event delivered twice = ignore the second.
    if (await this.#metricRepository.hasBookingMetric(command.metric.id)) return;
    await this.#metricRepository.saveBookingMetric(command.metric);
  }
}

module.exports = { RecordBookingCommand, RecordBookingHandler };
