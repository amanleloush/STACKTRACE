-- Smoke migration used to validate the local migration runner. Safe to keep
-- around — it just creates a tiny table that the rest of the schema doesn't
-- depend on. The real schema (users, sessions, subscriptions, etc.) lands
-- in Phase 3 (plan §12).
CREATE TABLE IF NOT EXISTS _smoke (
  id INTEGER PRIMARY KEY,
  hello TEXT NOT NULL
);
