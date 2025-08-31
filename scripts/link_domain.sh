#!/usr/bin/env bash
set -euo pipefail
: "${CF_PAGES_PROJECT:?}"
: "${CF_PAGES_DOMAIN:?}"

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

"$WR" pages domains add "$CF_PAGES_PROJECT" "$CF_PAGES_DOMAIN"
