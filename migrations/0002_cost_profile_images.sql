CREATE TABLE IF NOT EXISTS cost_profile_images (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
