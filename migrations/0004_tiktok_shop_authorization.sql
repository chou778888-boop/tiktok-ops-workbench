CREATE TABLE IF NOT EXISTS tiktok_shop_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS tiktok_shop_oauth_states_expires_at_idx
  ON tiktok_shop_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS tiktok_shop_connections (
  store_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  shop_cipher TEXT NOT NULL,
  shop_name TEXT NOT NULL DEFAULT '',
  shop_region TEXT NOT NULL DEFAULT '',
  access_token_cipher TEXT NOT NULL,
  refresh_token_cipher TEXT NOT NULL,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  granted_scopes TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  authorized_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_shop_connections_shop_id_idx
  ON tiktok_shop_connections(shop_id);
