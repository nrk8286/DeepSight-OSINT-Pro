#!/usr/bin/env bash
set -euo pipefail

: "${WORKER_ORIGIN:?Set WORKER_ORIGIN (e.g., https://...workers.dev)}"
: "${ADMIN_TOKEN:?Set ADMIN_TOKEN to test admin endpoints}"

hdr=( -H "Authorization: Bearer ${ADMIN_TOKEN}" -H 'content-type: application/json' )

echo "GET /api/flags"
curl -sS ${hdr[@]} "$WORKER_ORIGIN/api/flags" | jq -r . || true

echo "PUT /api/flags"
curl -sS -X PUT ${hdr[@]} "$WORKER_ORIGIN/api/flags" \
  --data '{"rateLimit":{"search":{"limit":30,"windowSec":60}}}' | jq -r . || true

echo "POST /api/images (sample)"
curl -sS -X POST ${hdr[@]} "$WORKER_ORIGIN/api/images" \
  --data '{"id":"admin-test","url":"https://example.com/img.jpg","text":"test"}' | jq -r . || true

echo "DELETE /api/images/admin-test"
curl -sS -X DELETE ${hdr[@]} "$WORKER_ORIGIN/api/images/admin-test" | jq -r . || true

