#!/usr/bin/env bash
set -euo pipefail
: "${CF_PAGES_PROJECT:?}"
: "${CF_PAGES_DOMAIN:?}"
wrangler pages domains add "$CF_PAGES_PROJECT" "$CF_PAGES_DOMAIN"
