const test = require('node:test');
const assert = require('node:assert/strict');
const { LoginUser, InvalidCredentialsError } = require('../../../src/application/use-cases/login-user');
const { RegisterUser } = require('../../../src/application/use-cases/register-user');
const { UserFactory } = require('../../../src/domain/factories/user-factory');
const { InMemoryUserRepository } = require('../../helpers/in-memory-repositories');
const { FakePasswordHasher, FakeTokenService } = require('../../helpers/fakes');

async function setup() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const userFactory = new UserFactory({ userRepository });
  const register = new RegisterUser({ userFactory, userRepository, passwordHasher, tokenService });
  const login = new LoginUser({ userRepository, passwordHasher, tokenService });
  await register.execute({ email: 'alice@x.com', password: 'password123', name: 'Alice' });
  return { login };
}

test('LoginUser returns a token on valid credentials', async () => {
  const { login } = await setup();
  const { token, user } = await login.execute({ email: 'alice@x.com', password: 'password123' });
  assert.ok(token);
  assert.equal(user.email.value, 'alice@x.com');
});

test('LoginUser throws InvalidCredentialsError on wrong password', async () => {
  const { login } = await setup();
  await assert.rejects(
    login.execute({ email: 'alice@x.com', password: 'WRONG' }),
    InvalidCredentialsError
  );
});

test('LoginUser throws InvalidCredentialsError on unknown email', async () => {
  const { login } = await setup();
  await assert.rejects(
    login.execute({ email: 'nobody@x.com', password: 'password123' }),
    InvalidCredentialsError
  );
});
