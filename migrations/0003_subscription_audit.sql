-- Phase 4a — subscription lifecycle audit + webhook idempotency.

-- Append-only audit log of every state transition. Lets us answer "why
-- is this user on tier=free? what happened?" without trusting Razorpay's
-- dashboard alone.
CREATE TABLE IF NOT EXISTS subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_event_id TEXT,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_tier TEXT,
  new_tier TEXT,
  payload TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id, created_at);

-- Idempotency: every Razorpay webhook delivery carries a unique event id.
-- Insert here on first processing; skip duplicate deliveries.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                 -- 'razorpay' | 'dev'
  received_at INTEGER NOT NULL
);
