require('dotenv').config();
const { openDatabase } = require('../infrastructure/db/connection');
const { createApp } = require('./app');
const { buildContainer, seedAdmin } = require('./composition-root');

async function main() {
  const port = Number(process.env.PORT) || 3000;
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const dbPath = process.env.DB_PATH || './data/app.db';
  const communicationMode = (process.env.COMMUNICATION_MODE || 'async').toLowerCase();
  if (!['sync', 'async'].includes(communicationMode)) {
    throw new Error(`COMMUNICATION_MODE must be 'sync' or 'async', got '${communicationMode}'`);
  }

  const db = openDatabase(dbPath);
  const container = buildContainer({ db, jwtSecret, communicationMode });

  await seedAdmin({
    container,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  const app = createApp({
    handlers: container.handlers,
    tokenService: container.services.tokenService,
  });
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`Communication mode: ${container.messaging.communicationMode}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
