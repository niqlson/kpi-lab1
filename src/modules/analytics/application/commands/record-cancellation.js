class RecordCancellationCommand {
  constructor({ metric }) { this.metric = metric; }
}

class RecordCancellationHandler {
  #metricRepository;

  constructor({ metricRepository }) {
    this.#metricRepository = metricRepository;
  }

  async handle(command) {
    if (await this.#metricRepository.hasCancellationMetric(command.metric.id)) return;
    await this.#metricRepository.saveCancellationMetric(command.metric);
  }
}

module.exports = { RecordCancellationCommand, RecordCancellationHandler };
