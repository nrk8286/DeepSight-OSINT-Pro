-- DeepSight D1 initial schema

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_images_created_at
  ON images (created_at DESC);

