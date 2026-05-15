// Analytics owns its own tables. Each row uses Analytics's vocabulary
// (actor_id, resource_id, ...) — not Core's (user_id, class_id).
function runAnalyticsMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_booking_metrics (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_title TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_cancellation_metrics (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_title TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_registration_metrics (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_booking_resource ON analytics_booking_metrics(resource_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_booking_actor    ON analytics_booking_metrics(actor_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_cancel_actor     ON analytics_cancellation_metrics(actor_id);
  `);
}

module.exports = { runAnalyticsMigrations };
