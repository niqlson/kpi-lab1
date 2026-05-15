const test = require('node:test');
const assert = require('node:assert/strict');
const { RegisterUser } = require('../../../src/application/use-cases/register-user');
const { UserFactory } = require('../../../src/domain/factories/user-factory');
const { InMemoryUserRepository } = require('../../helpers/in-memory-repositories');
const { FakePasswordHasher, FakeTokenService } = require('../../helpers/fakes');
const { ValidationError, ConflictError } = require('../../../src/domain/errors');

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const userFactory = new UserFactory({ userRepository });
  const useCase = new RegisterUser({ userFactory, userRepository, passwordHasher, tokenService });
  return { useCase, userRepository, tokenService };
}

test('RegisterUser hashes password, saves user and returns a token', async () => {
  const { useCase, userRepository } = buildUseCase();
  const { user, token } = await useCase.execute({
    email: 'alice@x.com', password: 'password123', name: 'Alice',
  });
  assert.equal(user.email.value, 'alice@x.com');
  assert.equal(user.passwordHash, 'hashed:password123');
  assert.ok(token.startsWith('token:'));
  const stored = await userRepository.findByEmail('alice@x.com');
  assert.ok(stored, 'user should be saved');
});

test('RegisterUser rejects short password', async () => {
  const { useCase } = buildUseCase();
  await assert.rejects(
    useCase.execute({ email: 'a@b.com', password: 'short', name: 'A' }),
    ValidationError
  );
});

test('RegisterUser propagates ConflictError from factory on duplicate email', async () => {
  const { useCase } = buildUseCase();
  await useCase.execute({ email: 'dup@x.com', password: 'password123', name: 'A' });
  await assert.rejects(
    useCase.execute({ email: 'DUP@x.com', password: 'password456', name: 'B' }),
    ConflictError
  );
});

test('RegisterUser rejects empty name', async () => {
  const { useCase } = buildUseCase();
  await assert.rejects(
    useCase.execute({ email: 'a@b.com', password: 'password123', name: '' }),
    ValidationError
  );
});
