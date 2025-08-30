#!/usr/bin/env bash
set -euo pipefail
echo "wrangler version:"
wrangler --version || true
echo "D1 databases:"
wrangler d1 list || true
echo "Pages projects:"
wrangler pages project list || true
