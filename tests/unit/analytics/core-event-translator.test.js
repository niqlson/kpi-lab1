// Tests the ACL — proves Core's field names disappear after translation.
// If Core ever renames `userId` to something else, only this test changes
// (and the translator) — not the rest of Analytics.

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoreEventTranslator } = require('../../../src/modules/analytics/acl/core-event-translator');
const { BookingCreated } = require('../../../src/modules/core/events/booking-created');
const { BookingCancelled } = require('../../../src/modules/core/events/booking-cancelled');
const { UserRegistered } = require('../../../src/modules/core/events/user-registered');
const { BookingMetric } = require('../../../src/modules/analytics/domain/models/booking-metric');
const { CancellationMetric } = require('../../../src/modules/analytics/domain/models/cancellation-metric');
const { RegistrationMetric } = require('../../../src/modules/analytics/domain/models/registration-metric');

test('toBookingMetric renames Core fields into Analytics vocabulary', () => {
  const t = new CoreEventTranslator();
  const event = new BookingCreated({
    bookingId: 'b-1', userId: 'u-1', email: 'a@x.com', name: 'Alice',
    classId: 'c-1', classTitle: 'Yoga', startsAt: '2099-01-01T10:00:00Z',
    occurredAt: '2099-01-01T09:00:00Z',
  });
  const metric = t.toBookingMetric(event);
  assert.ok(metric instanceof BookingMetric);
  assert.equal(metric.id, event.eventId);
  assert.equal(metric.actorId, 'u-1', 'userId → actorId');
  assert.equal(metric.resourceId, 'c-1', 'classId → resourceId');
  assert.equal(metric.resourceTitle, 'Yoga');
  assert.equal(metric.recordedAt, '2099-01-01T09:00:00Z');
  // None of Core's field names leak through.
  assert.equal(metric.userId, undefined);
  assert.equal(metric.classId, undefined);
  assert.equal(metric.email, undefined);
});

test('toCancellationMetric produces a CancellationMetric in Analytics terms', () => {
  const t = new CoreEventTranslator();
  const event = new BookingCancelled({
    bookingId: 'b-1', userId: 'u-1', email: 'a@x.com', name: 'A',
    classId: 'c-1', classTitle: 'Yoga', occurredAt: '2099-01-01T09:00:00Z',
  });
  const m = t.toCancellationMetric(event);
  assert.ok(m instanceof CancellationMetric);
  assert.equal(m.actorId, 'u-1');
  assert.equal(m.resourceId, 'c-1');
});

test('toRegistrationMetric ignores irrelevant Core fields', () => {
  const t = new CoreEventTranslator();
  const event = new UserRegistered({
    userId: 'u-1', email: 'a@x.com', name: 'Alice', occurredAt: '2099-01-01T09:00:00Z',
  });
  const m = t.toRegistrationMetric(event);
  assert.ok(m instanceof RegistrationMetric);
  assert.equal(m.actorId, 'u-1');
  assert.equal(m.registeredAt, '2099-01-01T09:00:00Z');
  assert.equal(m.email, undefined, 'email is a Core concern, not Analytics');
});
