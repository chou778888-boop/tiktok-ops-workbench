CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL
);

INSERT OR REPLACE INTO users VALUES ('user-hejingjing', 'Hejingjing', '何晶晶', 'member', 'ceb6a5ecf97d2767cf95f1a31ee129ac', '7c0e4de1327058286ebfd3670922fb10743143e94a81e9d38f6ecb436f1d3fc9', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-yeweining', 'Yeweining', '叶炜宁', 'member', '751e18c1bf614b09b4a6e8c153bbf114', '4a183df2774c1eadc04cfd6b550c8627af01174e7fe377211ab2fceb2cbff418', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-yangyuhui', 'Yangyuhui', '杨宇辉', 'member', '99da243d2396e4a5a5a77197a9129098', '59b5206d9aa13d8aec706d455700faed657044d54c64bb976f17043759c782b1', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-wangxuliang', 'Wangxuliang', '王旭亮', 'member', 'a4571b2af4a7233149ec59ab6065d72c', '29849734a304b1b01a153b1a65d6e11aa7cc1b0993ef3c3a911d74140599a152', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-wangxin', 'Wangxin', '王鑫', 'member', '459ab93bc8a2f57ae8ea11458988cebd', 'c787897a6f3a534aef2af630fc6f99f926a92288f0cf7cbb0c8291c044032b12', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-zhaoyini', 'Zhaoyini', '赵旖旎', 'member', 'a2b9cec1ce6cb24cd717aa9fdfab5c18', 'c8834d1d7975859e922e58b567f7d91c2e06ffb3da06c6c83be02157031c30e1', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-qiushiyu', 'Qiushiyu', '邱诗语', 'member', '6cebd77bc3bbb3094b228ec304bb6219', '7c1282531cdad12b499aa1aae978aa47a7b810717fc8b7c593d97bf28e80b1b6', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-chenmingyue', 'Chenmingyue', '陈明月', 'member', 'ee50f9ddf6d504650fade3296556e19a', 'f0c1ffc7fdf88a13fbbe78b78dd8310d1a86e277265a00204ce3a1a17d34625e', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-zhoukaihan', 'Zhoukaihan', '周恺涵', 'admin', 'c477285ec6880fa6321abeac4b3bbe4b', '92e0087bde86d623b010c1fbbce0627640dfb8eb929b8bbb1c4268100dd3cf07', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
INSERT OR REPLACE INTO users VALUES ('user-kk', 'KK', 'KK', 'admin', '1edec02c6b008dd234b5cbeca46d9080', '6b05caa540339e7bf837e65df2f8ab6c90a35549f6771115d144168adf76e184', 100000, 1, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z');
