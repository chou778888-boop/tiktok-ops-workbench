CREATE TABLE IF NOT EXISTS workbench_state (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_cache (
  fingerprint TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_rate_limit (
  rate_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_profile_images (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
