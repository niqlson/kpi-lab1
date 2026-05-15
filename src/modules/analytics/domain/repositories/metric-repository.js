// Write-side repository — Analytics records raw metric events.
class MetricRepository {
  async saveBookingMetric(_metric) { throw new Error('not implemented'); }
  async saveCancellationMetric(_metric) { throw new Error('not implemented'); }
  async saveRegistrationMetric(_metric) { throw new Error('not implemented'); }

  async hasBookingMetric(_eventId) { throw new Error('not implemented'); }
  async hasCancellationMetric(_eventId) { throw new Error('not implemented'); }
  async hasRegistrationMetric(_eventId) { throw new Error('not implemented'); }
}

module.exports = { MetricRepository };
