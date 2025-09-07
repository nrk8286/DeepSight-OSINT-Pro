#!/usr/bin/env bash
set -euo pipefail
if [ -f package.json ]; then
  npm i -D ajv@8 ajv-keywords@5 schema-utils@3 terser-webpack-plugin@5.3.10 >/dev/null 2>&1 || true
fi
