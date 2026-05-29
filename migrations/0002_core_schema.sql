-- Phase 3 core schema (plan §12 + §16).
-- D1-compatible SQLite. Single migration; future phases add their own files.

-- Users — one row per Google account that has signed in.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                  -- "usr_<random>"
  google_sub TEXT UNIQUE NOT NULL,      -- Google's stable subject claim
  email TEXT NOT NULL,
  name TEXT,
  picture_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',    -- 'user' | 'admin'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions — cookie → user. Lifetimes in unix seconds.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                  -- raw session id stored in the cookie
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Subscriptions — one row per user, tier resolved here.
-- Razorpay integration lands in Phase 4. Until then every row is `free`.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free',    -- 'free' | 'pro'
  status TEXT NOT NULL DEFAULT 'active',-- 'trialing'|'active'|'past_due'|'paused'|'cancelled_at_period_end'|'cancelled'
  current_period_end INTEGER
);

-- Per-entity gating overrides. Authoritative source of truth at runtime —
-- frontmatter `premium` is only the *default* when no row exists here.
CREATE TABLE IF NOT EXISTS entitlement_overrides (
  entity_kind TEXT NOT NULL,            -- 'note' | 'anim' | 'block'
  entity_id TEXT NOT NULL,              -- slug | anim-id | "<note-slug>:<block-key>"
  premium INTEGER NOT NULL,             -- 0 | 1
  preview_paragraphs INTEGER,           -- nullable; per-entity override of preview length
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (entity_kind, entity_id)
);

-- Per-user completion log. Feeds the roadmap progress overlay in Phase 5.
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, entity_kind, entity_id)
);

-- Feature flags — feeds the admin UI's flag tab + runtime `isFeatureOn(key)`.
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,                 -- 'ai_chatbot' | 'pdf_export' | …
  enabled INTEGER NOT NULL,
  audience TEXT NOT NULL DEFAULT 'pro'  -- 'free' | 'pro' | 'admin'
);

-- Public API keys (plan §16). Routes that consume them land in Phase 4;
-- the table + management UI live here so users can pre-mint keys.
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,                  -- "ak_<random>" public id
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL,            -- argon2 / sha256 of the secret half
  name TEXT NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER,
  daily_quota INTEGER NOT NULL DEFAULT 1000,
  daily_used INTEGER NOT NULL DEFAULT 0,
  quota_reset_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
