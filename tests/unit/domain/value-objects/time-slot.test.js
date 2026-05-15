const test = require('node:test');
const assert = require('node:assert/strict');
const { TimeSlot } = require('../../../../src/modules/core/domain/value-objects/time-slot');
const { ValidationError } = require('../../../../src/modules/core/domain/errors');

const T = (iso) => new Date(iso);

test('TimeSlot accepts a valid range', () => {
  const slot = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  assert.equal(slot.durationMinutes(), 60);
});

test('TimeSlot rejects end <= start', () => {
  assert.throws(
    () => new TimeSlot(T('2099-01-01T11:00:00Z'), T('2099-01-01T10:00:00Z')),
    ValidationError
  );
  assert.throws(
    () => new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T10:00:00Z')),
    ValidationError
  );
});

test('TimeSlot rejects invalid Date inputs', () => {
  assert.throws(() => new TimeSlot('not a date', new Date()), ValidationError);
  assert.throws(() => new TimeSlot(new Date('xx'), new Date()), ValidationError);
});

test('TimeSlot.overlaps detects overlap', () => {
  const a = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  const b = new TimeSlot(T('2099-01-01T10:30:00Z'), T('2099-01-01T11:30:00Z'));
  assert.ok(a.overlaps(b));
  assert.ok(b.overlaps(a));
});

test('TimeSlot.overlaps treats touching ranges as non-overlapping', () => {
  const a = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  const b = new TimeSlot(T('2099-01-01T11:00:00Z'), T('2099-01-01T12:00:00Z'));
  assert.ok(!a.overlaps(b));
});

test('TimeSlot.isInPast / hasStarted use the provided clock', () => {
  const slot = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  assert.ok(!slot.isInPast(T('2099-01-01T09:00:00Z')));
  assert.ok(!slot.hasStarted(T('2099-01-01T09:00:00Z')));
  assert.ok(slot.hasStarted(T('2099-01-01T10:00:00Z')));
  assert.ok(slot.isInPast(T('2099-02-01T00:00:00Z')));
});

test('TimeSlot equality is by value', () => {
  const a = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  const b = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  assert.ok(a.equals(b));
});

test('TimeSlot getters return defensive copies', () => {
  const slot = new TimeSlot(T('2099-01-01T10:00:00Z'), T('2099-01-01T11:00:00Z'));
  slot.start.setFullYear(2000);
  assert.equal(slot.start.getUTCFullYear(), 2099);
});
