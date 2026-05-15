const test = require('node:test');
const assert = require('node:assert/strict');
const { Email } = require('../../../../src/domain/value-objects/email');
const { ValidationError } = require('../../../../src/domain/errors');

test('Email accepts a normal email and lower-cases it', () => {
  const e = new Email('Alice@Example.COM');
  assert.equal(e.value, 'alice@example.com');
});

test('Email rejects a missing @', () => {
  assert.throws(() => new Email('not-an-email'), ValidationError);
});

test('Email rejects a missing TLD', () => {
  assert.throws(() => new Email('alice@example'), ValidationError);
});

test('Email rejects empty string', () => {
  assert.throws(() => new Email(''), ValidationError);
});

test('Email rejects non-string input', () => {
  assert.throws(() => new Email(null), ValidationError);
  assert.throws(() => new Email(undefined), ValidationError);
  assert.throws(() => new Email(42), ValidationError);
});

test('Email equality is by value, case-insensitive', () => {
  assert.ok(new Email('a@b.com').equals(new Email('A@B.COM')));
  assert.ok(!new Email('a@b.com').equals(new Email('c@d.com')));
});

test('Email exposes its domain part', () => {
  assert.equal(new Email('alice@example.com').domain(), 'example.com');
});
