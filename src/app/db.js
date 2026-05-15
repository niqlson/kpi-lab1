// Shared DB connection. Each module runs its own migrations against this
// connection — the modules can share a database file but they only write to
// their own tables (per the modular monolith lecture).

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

module.exports = { openDatabase };
