class RecordRegistrationCommand {
  constructor({ metric }) { this.metric = metric; }
}

class RecordRegistrationHandler {
  #metricRepository;

  constructor({ metricRepository }) {
    this.#metricRepository = metricRepository;
  }

  async handle(command) {
    if (await this.#metricRepository.hasRegistrationMetric(command.metric.id)) return;
    await this.#metricRepository.saveRegistrationMetric(command.metric);
  }
}

module.exports = { RecordRegistrationCommand, RecordRegistrationHandler };
