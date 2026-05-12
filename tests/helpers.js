const { openDatabase, seedAdmin } = require('../src/db');
const { createApp } = require('../src/app');

function buildTestApp() {
  const db = openDatabase(':memory:');
  seedAdmin(db, 'admin@test.local', 'admin12345');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  return { app, db };
}

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

module.exports = { buildTestApp, futureIso };
