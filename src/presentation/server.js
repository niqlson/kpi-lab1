require('dotenv').config();
const { openDatabase } = require('../infrastructure/db/connection');
const { createApp } = require('./app');
const { buildContainer, seedAdmin } = require('./composition-root');

async function main() {
  const port = Number(process.env.PORT) || 3000;
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const dbPath = process.env.DB_PATH || './data/app.db';

  const db = openDatabase(dbPath);
  const container = buildContainer({ db, jwtSecret });

  await seedAdmin({
    container,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  const app = createApp({ handlers: container.handlers, tokenService: container.services.tokenService });
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
