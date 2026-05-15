// Tests Analytics's internal commands against a fake metric repository.
// No DB, no event bus.

const test = require('node:test');
const assert = require('node:assert/strict');
const { RecordBookingCommand, RecordBookingHandler } = require('../../../src/modules/analytics/application/commands/record-booking');
const { RecordCancellationCommand, RecordCancellationHandler } = require('../../../src/modules/analytics/application/commands/record-cancellation');
const { RecordRegistrationCommand, RecordRegistrationHandler } = require('../../../src/modules/analytics/application/commands/record-registration');
const { MetricRepository } = require('../../../src/modules/analytics/domain/repositories/metric-repository');
const { BookingMetric } = require('../../../src/modules/analytics/domain/models/booking-metric');
const { CancellationMetric } = require('../../../src/modules/analytics/domain/models/cancellation-metric');
const { RegistrationMetric } = require('../../../src/modules/analytics/domain/models/registration-metric');

class InMemoryMetricRepository extends MetricRepository {
  constructor() {
    super();
    this.bookings = new Map();
    this.cancellations = new Map();
    this.registrations = new Map();
  }
  async saveBookingMetric(m) { this.bookings.set(m.id, m); }
  async saveCancellationMetric(m) { this.cancellations.set(m.id, m); }
  async saveRegistrationMetric(m) { this.registrations.set(m.id, m); }
  async hasBookingMetric(id) { return this.bookings.has(id); }
  async hasCancellationMetric(id) { return this.cancellations.has(id); }
  async hasRegistrationMetric(id) { return this.registrations.has(id); }
}

test('RecordBooking persists the metric', async () => {
  const repo = new InMemoryMetricRepository();
  const h = new RecordBookingHandler({ metricRepository: repo });
  const metric = new BookingMetric({
    id: 'evt-1', actorId: 'u-1', resourceId: 'c-1',
    resourceTitle: 'Yoga', recordedAt: '2099-01-01',
  });
  await h.handle(new RecordBookingCommand({ metric }));
  assert.equal(repo.bookings.size, 1);
});

test('RecordBooking is idempotent — same eventId twice = stored once', async () => {
  const repo = new InMemoryMetricRepository();
  const h = new RecordBookingHandler({ metricRepository: repo });
  const metric = new BookingMetric({
    id: 'evt-1', actorId: 'u-1', resourceId: 'c-1',
    resourceTitle: 'Yoga', recordedAt: '2099-01-01',
  });
  await h.handle(new RecordBookingCommand({ metric }));
  await h.handle(new RecordBookingCommand({ metric }));
  assert.equal(repo.bookings.size, 1, 'second delivery must be a no-op');
});

test('RecordCancellation is idempotent', async () => {
  const repo = new InMemoryMetricRepository();
  const h = new RecordCancellationHandler({ metricRepository: repo });
  const metric = new CancellationMetric({
    id: 'evt-2', actorId: 'u-1', resourceId: 'c-1',
    resourceTitle: 'Yoga', recordedAt: '2099-01-01',
  });
  await h.handle(new RecordCancellationCommand({ metric }));
  await h.handle(new RecordCancellationCommand({ metric }));
  assert.equal(repo.cancellations.size, 1);
});

test('RecordRegistration is idempotent', async () => {
  const repo = new InMemoryMetricRepository();
  const h = new RecordRegistrationHandler({ metricRepository: repo });
  const metric = new RegistrationMetric({
    id: 'evt-3', actorId: 'u-1', registeredAt: '2099-01-01',
  });
  await h.handle(new RecordRegistrationCommand({ metric }));
  await h.handle(new RecordRegistrationCommand({ metric }));
  assert.equal(repo.registrations.size, 1);
});
