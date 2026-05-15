const test = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../../../../src/modules/core/domain/entities/user');
const { Email } = require('../../../../src/modules/core/domain/value-objects/email');
const { ValidationError } = require('../../../../src/modules/core/domain/errors');

const baseFields = () => ({
  id: 'user-1',
  email: new Email('alice@example.com'),
  name: 'Alice',
  role: 'client',
  passwordHash: 'hashed:abc',
  createdAt: new Date(),
});

test('User accepts valid input', () => {
  const u = new User(baseFields());
  assert.equal(u.role, 'client');
  assert.equal(u.email.value, 'alice@example.com');
  assert.equal(u.isAdmin(), false);
});

test('User.isAdmin reflects role', () => {
  const u = new User({ ...baseFields(), role: 'admin' });
  assert.ok(u.isAdmin());
});

test('User rejects unknown role', () => {
  assert.throws(() => new User({ ...baseFields(), role: 'wizard' }), ValidationError);
});

test('User rejects raw string email (must be Email VO)', () => {
  assert.throws(
    () => new User({ ...baseFields(), email: 'alice@example.com' }),
    ValidationError
  );
});

test('User rejects empty name and missing passwordHash', () => {
  assert.throws(() => new User({ ...baseFields(), name: '' }), ValidationError);
  assert.throws(() => new User({ ...baseFields(), passwordHash: '' }), ValidationError);
});

test('User equality is by id', () => {
  const a = new User(baseFields());
  const b = new User({ ...baseFields(), name: 'Different Name' });
  assert.ok(a.equals(b));
});
