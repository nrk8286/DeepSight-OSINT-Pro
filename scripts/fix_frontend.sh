#!/usr/bin/env bash
set -Eeuo pipefail
FP="${1:?frontend path required}"

pkill -f react-scripts || true
pkill -f node || true

npm cache clean --force || true

rm -f "$FP/package-lock.json" || true
npx --yes rimraf "$FP/node_modules" || rm -rf "$FP/node_modules" || true

npm config set fetch-retries 5
npm config set fetch-retry-maxtimeout 120000
npm config set prefer-online true

pushd "$FP" >/dev/null
export HUSKY=0
if [ -f package-lock.json ]; then
  npm ci --no-audit --fund=false --no-optional
else
  npm install --legacy-peer-deps --no-audit --fund=false --no-optional
fi
npm rebuild
popd >/dev/null
