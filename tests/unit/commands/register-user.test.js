const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RegisterUserCommand,
  RegisterUserHandler,
} = require('../../../src/modules/core/application/commands/register-user');
const { UserFactory } = require('../../../src/modules/core/domain/factories/user-factory');
const { InMemoryUserRepository } = require('../../helpers/in-memory-repositories');
const { FakePasswordHasher, FakeTokenService } = require('../../helpers/fakes');
const { ValidationError, ConflictError } = require('../../../src/modules/core/domain/errors');

function build() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const userFactory = new UserFactory({ userRepository });
  return {
    handler: new RegisterUserHandler({ userFactory, userRepository, passwordHasher, tokenService }),
    userRepository,
  };
}

test('RegisterUser hashes password, saves user and returns {userId, token}', async () => {
  const { handler, userRepository } = build();
  const result = await handler.handle(new RegisterUserCommand({
    email: 'alice@x.com', password: 'password123', name: 'Alice',
  }));
  assert.ok(result.userId);
  assert.ok(result.token.startsWith('token:'));
  const stored = await userRepository.findByEmail('alice@x.com');
  assert.equal(stored.passwordHash, 'hashed:password123');
});

test('RegisterUser rejects short password', async () => {
  const { handler } = build();
  await assert.rejects(
    handler.handle(new RegisterUserCommand({ email: 'a@b.com', password: 'short', name: 'A' })),
    ValidationError
  );
});

test('RegisterUser rejects empty name', async () => {
  const { handler } = build();
  await assert.rejects(
    handler.handle(new RegisterUserCommand({ email: 'a@b.com', password: 'password123', name: '' })),
    ValidationError
  );
});

test('RegisterUser propagates ConflictError on duplicate email', async () => {
  const { handler } = build();
  await handler.handle(new RegisterUserCommand({ email: 'dup@x.com', password: 'password123', name: 'A' }));
  await assert.rejects(
    handler.handle(new RegisterUserCommand({ email: 'DUP@x.com', password: 'password456', name: 'B' })),
    ConflictError
  );
});
