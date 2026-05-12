const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
  isPositiveInt,
  isValidIsoDate,
  validateClassInput,
} = require('../../src/utils/validation');

test('isValidEmail accepts a normal email', () => {
  assert.equal(isValidEmail('john@example.com'), true);
});

test('isValidEmail rejects malformed input', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('john@'), false);
  assert.equal(isValidEmail('@example.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
});

test('isValidPassword requires at least 8 characters', () => {
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword(''), false);
  assert.equal(isValidPassword(12345678), false);
});

test('isNonEmptyString rejects whitespace-only strings', () => {
  assert.equal(isNonEmptyString('hello'), true);
  assert.equal(isNonEmptyString('  '), false);
  assert.equal(isNonEmptyString(''), false);
  assert.equal(isNonEmptyString(123), false);
});

test('isPositiveInt accepts 1+ and rejects floats and zero', () => {
  assert.equal(isPositiveInt(1), true);
  assert.equal(isPositiveInt(100), true);
  assert.equal(isPositiveInt(0), false);
  assert.equal(isPositiveInt(-1), false);
  assert.equal(isPositiveInt(1.5), false);
  assert.equal(isPositiveInt('5'), false);
});

test('isValidIsoDate accepts ISO strings and rejects garbage', () => {
  assert.equal(isValidIsoDate('2099-01-01T10:00:00.000Z'), true);
  assert.equal(isValidIsoDate('not a date'), false);
  assert.equal(isValidIsoDate(''), false);
});

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

test('validateClassInput passes for a valid future class', () => {
  const errors = validateClassInput({
    title: 'Yoga',
    instructor: 'Anna',
    startsAt: futureIso(60),
    endsAt: futureIso(120),
    capacity: 10,
  });
  assert.deepEqual(errors, []);
});

test('validateClassInput rejects class in the past', () => {
  const errors = validateClassInput({
    title: 'Yoga',
    instructor: 'Anna',
    startsAt: '2000-01-01T10:00:00.000Z',
    endsAt: '2000-01-01T11:00:00.000Z',
    capacity: 10,
  });
  assert.ok(errors.some(e => e.includes('future')), `got: ${errors.join(', ')}`);
});

test('validateClassInput rejects when endsAt <= startsAt', () => {
  const errors = validateClassInput({
    title: 'Yoga',
    instructor: 'Anna',
    startsAt: futureIso(120),
    endsAt: futureIso(60),
    capacity: 10,
  });
  assert.ok(errors.some(e => e.includes('after')), `got: ${errors.join(', ')}`);
});

test('validateClassInput rejects non-positive capacity', () => {
  const errors = validateClassInput({
    title: 'Yoga',
    instructor: 'Anna',
    startsAt: futureIso(60),
    endsAt: futureIso(120),
    capacity: 0,
  });
  assert.ok(errors.some(e => e.includes('capacity')), `got: ${errors.join(', ')}`);
});

test('validateClassInput rejects empty title and instructor', () => {
  const errors = validateClassInput({
    title: '',
    instructor: '   ',
    startsAt: futureIso(60),
    endsAt: futureIso(120),
    capacity: 5,
  });
  assert.ok(errors.some(e => e.includes('title')));
  assert.ok(errors.some(e => e.includes('instructor')));
});

test('validateClassInput in partial mode only checks supplied fields', () => {
  const errors = validateClassInput({ capacity: 5 }, { partial: true });
  assert.deepEqual(errors, []);
});
