#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
D1_DB_NAME="${D1_DB_NAME:-deepsight_db}"
D1_LOCAL_FLAG="${D1_LOCAL:-}"

command -v wrangler >/dev/null || { echo "wrangler required: npm i -g wrangler"; exit 1; }

echo "Applying schema to D1 ($D1_DB_NAME)..."
if [ -f "$ROOT/backend/schema.sql" ]; then
  if [ -n "$D1_LOCAL_FLAG" ]; then
    wrangler d1 execute "$D1_DB_NAME" --local --file "$ROOT/backend/schema.sql"
  else
    wrangler d1 execute "$D1_DB_NAME" --file "$ROOT/backend/schema.sql"
  fi
else
  echo "No schema.sql found; skipping schema apply."
fi

echo "Seeding sample data into D1 ($D1_DB_NAME)..."
if [ -f "$ROOT/backend/seed.sql" ]; then
  if [ -n "$D1_LOCAL_FLAG" ]; then
    wrangler d1 execute "$D1_DB_NAME" --local --file "$ROOT/backend/seed.sql"
  else
    wrangler d1 execute "$D1_DB_NAME" --file "$ROOT/backend/seed.sql"
  fi
else
  echo "No seed.sql found; nothing to seed."
fi

echo "Done."
