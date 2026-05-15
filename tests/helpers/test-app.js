const { openDatabase } = require('../../src/app/db');
const { createApp } = require('../../src/app/app');
const { buildContainer } = require('../../src/app/composition-root');

async function buildTestApp(options = {}) {
  const db = openDatabase(':memory:');
  const container = buildContainer({ db, jwtSecret: 'test-secret', ...options });
  await container.core.seedAdmin({
    email: 'admin@test.local',
    password: 'admin12345',
  });
  const app = createApp({ container });
  return { app, db, container };
}

module.exports = { buildTestApp };
