require('dotenv').config();
const { openDatabase, seedAdmin } = require('./db');
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
const dbPath = process.env.DB_PATH || './data/app.db';

const db = openDatabase(dbPath);
seedAdmin(db, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

const app = createApp({ db, jwtSecret });
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
