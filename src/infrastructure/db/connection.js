const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { runMigrations } = require('./migrations');

function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

module.exports = { openDatabase };
