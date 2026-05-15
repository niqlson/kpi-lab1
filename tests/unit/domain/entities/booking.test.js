const test = require('node:test');
const assert = require('node:assert/strict');
const { Booking } = require('../../../../src/modules/core/domain/entities/booking');
const { ValidationError } = require('../../../../src/modules/core/domain/errors');

const valid = () => ({
  id: 'b-1',
  userId: 'u-1',
  classId: 'c-1',
  createdAt: new Date(),
});

test('Booking accepts valid input', () => {
  const b = new Booking(valid());
  assert.equal(b.userId, 'u-1');
  assert.equal(b.classId, 'c-1');
});

test('Booking rejects missing fields', () => {
  assert.throws(() => new Booking({ ...valid(), id: '' }), ValidationError);
  assert.throws(() => new Booking({ ...valid(), userId: '' }), ValidationError);
  assert.throws(() => new Booking({ ...valid(), classId: '' }), ValidationError);
});

test('Booking.belongsTo checks ownership', () => {
  const b = new Booking(valid());
  assert.ok(b.belongsTo('u-1'));
  assert.ok(!b.belongsTo('u-2'));
});
