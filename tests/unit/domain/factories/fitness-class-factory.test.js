const test = require('node:test');
const assert = require('node:assert/strict');
const { FitnessClassFactory } = require('../../../../src/domain/factories/fitness-class-factory');
const { ValidationError } = require('../../../../src/domain/errors');
const { futureIso } = require('../../../helpers/fakes');

test('FitnessClassFactory.create produces a valid class on the happy path', () => {
  const f = new FitnessClassFactory();
  const c = f.create({
    title: 'Yoga',
    description: 'Hatha',
    instructor: 'Anna',
    startsAt: futureIso(60),
    endsAt: futureIso(120),
    capacity: 10,
  });
  assert.ok(c.id);
  assert.equal(c.title, 'Yoga');
  assert.equal(c.capacity, 10);
});

test('FitnessClassFactory rejects past startsAt', () => {
  const f = new FitnessClassFactory();
  assert.throws(
    () =>
      f.create({
        title: 'Yoga',
        instructor: 'Anna',
        startsAt: '2000-01-01T00:00:00.000Z',
        endsAt: '2000-01-01T01:00:00.000Z',
        capacity: 10,
      }),
    ValidationError
  );
});

test('FitnessClassFactory rejects endsAt <= startsAt (delegates to TimeSlot)', () => {
  const f = new FitnessClassFactory();
  assert.throws(
    () =>
      f.create({
        title: 'Yoga',
        instructor: 'Anna',
        startsAt: futureIso(120),
        endsAt: futureIso(60),
        capacity: 10,
      }),
    ValidationError
  );
});

test('FitnessClassFactory rejects garbage date strings', () => {
  const f = new FitnessClassFactory();
  assert.throws(
    () =>
      f.create({
        title: 'Yoga',
        instructor: 'Anna',
        startsAt: 'not-a-date',
        endsAt: futureIso(60),
        capacity: 10,
      }),
    ValidationError
  );
});

test('FitnessClassFactory rejects bad capacity (delegates to entity)', () => {
  const f = new FitnessClassFactory();
  assert.throws(
    () =>
      f.create({
        title: 'Yoga',
        instructor: 'Anna',
        startsAt: futureIso(60),
        endsAt: futureIso(120),
        capacity: 0,
      }),
    ValidationError
  );
});
