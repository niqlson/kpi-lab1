const test = require('node:test');
const assert = require('node:assert/strict');
const { FitnessClass } = require('../../../../src/modules/core/domain/entities/fitness-class');
const { TimeSlot } = require('../../../../src/modules/core/domain/value-objects/time-slot');
const { ValidationError, ConflictError } = require('../../../../src/modules/core/domain/errors');

const futureSlot = (offsetMin = 60, durationMin = 60) =>
  new TimeSlot(
    new Date(Date.now() + offsetMin * 60_000),
    new Date(Date.now() + (offsetMin + durationMin) * 60_000)
  );

function buildClass(overrides = {}) {
  return new FitnessClass({
    id: 'cls-1',
    title: 'Yoga',
    description: '',
    instructor: 'Anna',
    timeSlot: futureSlot(),
    capacity: 10,
    createdAt: new Date(),
    ...overrides,
  });
}

test('FitnessClass rejects empty title at construction', () => {
  assert.throws(() => buildClass({ title: '' }), ValidationError);
});

test('FitnessClass rejects non-positive capacity at construction', () => {
  assert.throws(() => buildClass({ capacity: 0 }), ValidationError);
  assert.throws(() => buildClass({ capacity: -1 }), ValidationError);
  assert.throws(() => buildClass({ capacity: 1.5 }), ValidationError);
});

test('FitnessClass.rename updates and re-validates', () => {
  const c = buildClass();
  c.rename('Power Yoga');
  assert.equal(c.title, 'Power Yoga');
  assert.throws(() => c.rename(''), ValidationError);
});

test('FitnessClass.changeCapacity refuses to go below current bookings', () => {
  const c = buildClass({ capacity: 10 });
  c.changeCapacity(5, 3); // ok
  assert.equal(c.capacity, 5);
  assert.throws(() => c.changeCapacity(2, 3), ConflictError);
});

test('FitnessClass.reschedule rejects past time slots', () => {
  const c = buildClass();
  const pastSlot = new TimeSlot(
    new Date(Date.now() - 120 * 60_000),
    new Date(Date.now() - 60 * 60_000)
  );
  assert.throws(() => c.reschedule(pastSlot), ValidationError);
});

test('FitnessClass.ensureCanAcceptBooking throws when full', () => {
  const c = buildClass({ capacity: 2 });
  assert.throws(() => c.ensureCanAcceptBooking(2), ConflictError);
});

test('FitnessClass.ensureCanAcceptBooking throws when class has started', () => {
  const c = buildClass();
  const futureNow = new Date(c.timeSlot.start.getTime() + 1);
  assert.throws(() => c.ensureCanAcceptBooking(0, futureNow), ConflictError);
});

test('FitnessClass.ensureCanAcceptBooking is silent when ok', () => {
  const c = buildClass({ capacity: 5 });
  assert.doesNotThrow(() => c.ensureCanAcceptBooking(3));
});
