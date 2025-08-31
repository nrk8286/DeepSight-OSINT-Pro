#!/usr/bin/env bash
set -euo pipefail

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

echo "wrangler version:"
"$WR" --version || true
echo "D1 databases:"
"$WR" d1 list || true
echo "Pages projects:"
"$WR" pages project list || true
