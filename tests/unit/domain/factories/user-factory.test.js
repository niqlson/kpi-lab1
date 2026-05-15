const test = require('node:test');
const assert = require('node:assert/strict');
const { UserFactory } = require('../../../../src/modules/core/domain/factories/user-factory');
const { InMemoryUserRepository } = require('../../../helpers/in-memory-repositories');
const { ValidationError, ConflictError } = require('../../../../src/modules/core/domain/errors');

test('UserFactory.create produces a valid User on the happy path', async () => {
  const repo = new InMemoryUserRepository();
  const factory = new UserFactory({ userRepository: repo });
  const u = await factory.create({
    email: 'alice@example.com',
    name: 'Alice',
    passwordHash: 'hashed:abc',
  });
  assert.ok(u.id);
  assert.equal(u.email.value, 'alice@example.com');
  assert.equal(u.role, 'client');
});

test('UserFactory rejects invalid email (delegates to Email VO)', async () => {
  const factory = new UserFactory({ userRepository: new InMemoryUserRepository() });
  await assert.rejects(
    factory.create({ email: 'not-an-email', name: 'Alice', passwordHash: 'h' }),
    ValidationError
  );
});

test('UserFactory rejects missing passwordHash', async () => {
  const factory = new UserFactory({ userRepository: new InMemoryUserRepository() });
  await assert.rejects(
    factory.create({ email: 'a@b.com', name: 'A', passwordHash: '' }),
    ValidationError
  );
});

test('UserFactory throws ConflictError on duplicate email (uses repository)', async () => {
  const repo = new InMemoryUserRepository();
  const factory = new UserFactory({ userRepository: repo });
  const u1 = await factory.create({ email: 'dup@x.com', name: 'A', passwordHash: 'h' });
  await repo.save(u1);
  await assert.rejects(
    factory.create({ email: 'DUP@x.com', name: 'B', passwordHash: 'h' }),
    ConflictError
  );
});

test('UserFactory accepts injected idGenerator and clock for determinism', async () => {
  const repo = new InMemoryUserRepository();
  const fixedNow = new Date('2099-01-01T00:00:00Z');
  const factory = new UserFactory({
    userRepository: repo,
    clock: () => fixedNow,
    idGenerator: () => 'fixed-id',
  });
  const u = await factory.create({ email: 'a@b.com', name: 'A', passwordHash: 'h' });
  assert.equal(u.id, 'fixed-id');
  assert.equal(u.createdAt.toISOString(), fixedNow.toISOString());
});
