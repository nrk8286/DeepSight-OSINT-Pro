CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  phash TEXT,
  ahash TEXT,
  dhash TEXT,
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS vectors_text (
  id TEXT PRIMARY KEY,
  dims INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS vectors_image (
  id TEXT PRIMARY KEY,
  dims INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_images_url ON images(url);
CREATE INDEX IF NOT EXISTS idx_images_phash ON images(phash);
