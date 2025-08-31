#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
D1_DB_NAME="${D1_DB_NAME:-deepsight_db}"
D1_LOCAL_FLAG="${D1_LOCAL:-}"

find_wrangler() {
  if command -v wrangler >/dev/null 2>&1; then
    echo "wrangler"
    return
  fi
  if [ -n "${APPDATA:-}" ]; then
    for c in "$APPDATA/npm/wrangler" "$APPDATA/npm/wrangler.cmd"; do
      if [ -x "$c" ]; then
        echo "$c"
        return
      fi
    done
  fi
  echo "wrangler"
}
WR=$(find_wrangler)

echo "Applying schema to D1 ($D1_DB_NAME)..."
if [ -f "$ROOT/backend/schema.sql" ]; then
  if [ -n "$D1_LOCAL_FLAG" ]; then
    "$WR" d1 execute "$D1_DB_NAME" --local --file "$ROOT/backend/schema.sql"
  else
    "$WR" d1 execute "$D1_DB_NAME" --file "$ROOT/backend/schema.sql"
  fi
else
  echo "No schema.sql found; skipping schema apply."
fi

echo "Seeding sample data into D1 ($D1_DB_NAME)..."
if [ -f "$ROOT/backend/seed.sql" ]; then
  if [ -n "$D1_LOCAL_FLAG" ]; then
    "$WR" d1 execute "$D1_DB_NAME" --local --file "$ROOT/backend/seed.sql"
  else
    "$WR" d1 execute "$D1_DB_NAME" --file "$ROOT/backend/seed.sql"
  fi
else
  echo "No seed.sql found; nothing to seed."
fi

echo "Done."
