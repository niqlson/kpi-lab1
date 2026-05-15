const { openDatabase } = require('../../src/infrastructure/db/connection');
const { createApp } = require('../../src/presentation/app');
const { buildContainer, seedAdmin } = require('../../src/presentation/composition-root');

async function buildTestApp() {
  const db = openDatabase(':memory:');
  const container = buildContainer({ db, jwtSecret: 'test-secret' });
  await seedAdmin({
    container,
    email: 'admin@test.local',
    password: 'admin12345',
  });
  const app = createApp({
    useCases: container.useCases,
    tokenService: container.services.tokenService,
  });
  return { app, db, container };
}

module.exports = { buildTestApp };
