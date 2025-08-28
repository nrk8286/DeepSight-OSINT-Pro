DeepSight Cloudflare Deploy Kit (v4)

WHAT YOU NEED
- CLOUDFLARE_API_TOKEN with permissions: D1:Edit, Workers:Edit, Pages:Edit (and DNS:Edit if you want automatic domain attach).
- CLOUDFLARE_ACCOUNT_ID (find in Cloudflare dashboard).
- A CRA frontend placed in ./frontend (this folder must contain package.json).
- Optional: custom domain (CF_PAGES_DOMAIN) and worker route pattern (WORKER_ROUTE_PATTERN).

ENV VARS (examples)
  CLOUDFLARE_API_TOKEN=<YOUR_CF_API_TOKEN>
  CLOUDFLARE_ACCOUNT_ID=<YOUR_CF_ACCOUNT_ID>
  CF_PAGES_PROJECT=deepsight-osint-pro
  REACT_APP_API_ORIGIN=https://api.gptmarketplus.uk
  # Optional:
  CF_PAGES_DOMAIN=www.gptmarketplus.uk
  CF_ZONE_NAME=gptmarketplus.uk
  WORKER_ROUTE_PATTERN=*.gptmarketplus.uk/*
  D1_DB_NAME=deepsight_db
  R2_BUCKET=<YOUR_R2_BUCKET_NAME>
  # Optional admin token for write actions (set as secret in production):
  ADMIN_TOKEN=<set locally for dev only>

RUN (Linux/macOS/Git-Bash)
  export CLOUDFLARE_API_TOKEN=...
  export CLOUDFLARE_ACCOUNT_ID=...
  export CF_PAGES_PROJECT=deepsight-osint-pro
  export REACT_APP_API_ORIGIN=https://api.example.com
  # Optional: export R2_BUCKET and ADMIN_TOKEN for local/dev
  bash scripts/deploy_cloudflare.sh

RUN (Windows PowerShell)
  $env:CLOUDFLARE_API_TOKEN="..."
  $env:CLOUDFLARE_ACCOUNT_ID="..."
  $env:CF_PAGES_PROJECT="deepsight-osint-pro"
  $env:REACT_APP_API_ORIGIN="https://api.example.com"
  # Optional: $env:R2_BUCKET and $env:ADMIN_TOKEN for local/dev
  powershell -ExecutionPolicy Bypass -File scripts/deploy_cloudflare.ps1

PLACES TO DROP YOUR CODE
  ./frontend  -> your CRA app (package.json required)
  ./backend   -> worker.js (provided) + wrangler.toml (auto-injected with D1 id)
  ./backend/schema.sql -> optional D1 schema (auto-applied if exists)

TROUBLESHOOTING
- npm ci without lockfile: kit falls back to 'npm install --legacy-peer-deps'
- Windows EPERM on node_modules: kit uses 'npx rimraf' as fallback
- ajv/ajv-keywords build errors: kit runs scripts/fix_ajv_build.sh to pin versions
- D1 missing database_id: kit auto lists/creates and injects database_id into wrangler.toml
- No jq: JSON parsing is done via 'node -e' one-liners
 - Secrets: Use 'wrangler secret put ADMIN_TOKEN' for production; avoid writing secrets into wrangler.toml
