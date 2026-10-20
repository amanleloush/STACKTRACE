-- Company-wise DSA tracker (/dsa/companies/). One row per (user, LeetCode
-- problem). Keyed by problem slug — not by company — so solving "two-sum"
-- once lights it up on every company list that contains it.
--
-- `updated_at` is the client's ms timestamp of the edit; the PUT upsert only
-- overwrites when the incoming value is newer (last-write-wins across
-- devices). The PK's user_id prefix serves the "all rows for me" read.
CREATE TABLE IF NOT EXISTS problem_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_slug TEXT NOT NULL,           -- ^[a-z0-9-]{1,120}$ (validated in the API)
  solved INTEGER NOT NULL DEFAULT 0,    -- 0 | 1
  notes TEXT NOT NULL DEFAULT '',       -- ≤ 20 000 chars; never logged
  updated_at INTEGER NOT NULL,          -- unix ms, client clock
  PRIMARY KEY (user_id, problem_slug)
);
