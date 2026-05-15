const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LoginUserCommand,
  LoginUserHandler,
  InvalidCredentialsError,
} = require('../../../src/application/commands/login-user');
const {
  RegisterUserCommand,
  RegisterUserHandler,
} = require('../../../src/application/commands/register-user');
const { UserFactory } = require('../../../src/domain/factories/user-factory');
const { InMemoryUserRepository } = require('../../helpers/in-memory-repositories');
const { FakePasswordHasher, FakeTokenService } = require('../../helpers/fakes');

async function setup() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const userFactory = new UserFactory({ userRepository });
  const register = new RegisterUserHandler({ userFactory, userRepository, passwordHasher, tokenService });
  const login = new LoginUserHandler({ userRepository, passwordHasher, tokenService });
  await register.handle(new RegisterUserCommand({
    email: 'alice@x.com', password: 'password123', name: 'Alice',
  }));
  return { login };
}

test('LoginUser returns {userId, token} on valid credentials', async () => {
  const { login } = await setup();
  const result = await login.handle(new LoginUserCommand({
    email: 'alice@x.com', password: 'password123',
  }));
  assert.ok(result.userId);
  assert.ok(result.token);
});

test('LoginUser throws InvalidCredentialsError on wrong password', async () => {
  const { login } = await setup();
  await assert.rejects(
    login.handle(new LoginUserCommand({ email: 'alice@x.com', password: 'WRONG' })),
    InvalidCredentialsError
  );
});

test('LoginUser throws InvalidCredentialsError on unknown email', async () => {
  const { login } = await setup();
  await assert.rejects(
    login.handle(new LoginUserCommand({ email: 'nobody@x.com', password: 'password123' })),
    InvalidCredentialsError
  );
});
