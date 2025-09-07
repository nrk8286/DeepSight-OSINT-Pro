#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Cloudflare API Token for authentication.
# Set via environment variable (CI/CD or local shell). No defaults here.
# Example: export CLOUDFLARE_API_TOKEN="<your_token>"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN must be set."
  exit 1
fi

# Cloudflare Account ID.
# Set via environment variable. No defaults here.
# Example: export CLOUDFLARE_ACCOUNT_ID="<your_account_id>"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID must be set."
  exit 1
fi

# Cloudflare Pages Project name. This is a mandatory environment variable.
# Example: export CF_PAGES_PROJECT="my-deepsight-frontend"
export CF_PAGES_PROJECT="${CF_PAGES_PROJECT:-my-deepsight-frontend}"
if [ -z "$CF_PAGES_PROJECT" ]; then
  echo "Error: CF_PAGES_PROJECT environment variable must be set."
  exit 1
fi

# React App API Origin. This is a mandatory environment variable.
# Example: export REACT_APP_API_ORIGIN="https://api.example.com"
export REACT_APP_API_ORIGIN="${REACT_APP_API_ORIGIN:?Error: REACT_APP_API_ORIGIN environment variable must be set. This is the API endpoint for the React application.}"
D1_DB_NAME="${D1_DB_NAME:-deepsight_db}"
R2_BUCKET="${R2_BUCKET:-}"
FRONTEND_DIR="${ROOT}/frontend"
BACKEND_DIR="${ROOT}/backend"

echo "Checking tools..."
command -v node >/dev/null || { echo "node required"; exit 1; }
command -v npm >/dev/null || { echo "npm required"; exit 1; }

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

echo "Building CRA in $FRONTEND_DIR with REACT_APP_API_ORIGIN=$REACT_APP_API_ORIGIN"
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: ./frontend/package.json not found"
  exit 1
fi
pushd "$FRONTEND_DIR" >/dev/null
  if [ -d node_modules ]; then
    echo "Cleaning node_modules..."
    rm -rf node_modules || true
    npx --yes rimraf node_modules || true
  fi
  if [ -f package-lock.json ]; then
    npm ci || npm install --legacy-peer-deps
  else
    npm install --legacy-peer-deps
  fi
  bash "$ROOT/scripts/fix_ajv_build.sh" || true
  REACT_APP_API_ORIGIN="$REACT_APP_API_ORIGIN" npm run build
popd >/dev/null

echo "Ensure D1 exists..."
D1_LIST_JSON="$(CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" "$WR" d1 list --json || echo '[]')"
DB_ID="$(echo "$D1_LIST_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);const name=process.env.D1_DB_NAME||"deepsight_db";const m=(Array.isArray(j)?j:[]).find(x=>x.name===name);if(m&&m.uuid){console.log(m.uuid);process.exit(0)}process.exit(1)}catch(e){process.exit(2)}});')"

if [ -z "${DB_ID:-}" ]; then
  echo "Creating D1 $D1_DB_NAME..."
  CREATE_JSON="$("$WR" d1 create "$D1_DB_NAME" --json)"
  DB_ID="$(echo "$CREATE_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);console.log(j.uuid||j.id||"")}catch(e){}});')"
  if [ -z "$DB_ID" ]; then
    echo "Failed to create D1"
    exit 1
  fi
fi
echo "D1 database_id: $DB_ID"

if [ -f "$BACKEND_DIR/schema.sql" ]; then
  echo "Applying schema.sql to D1..."
  "$WR" d1 execute "$D1_DB_NAME" --file "$BACKEND_DIR/schema.sql" || true
fi

echo "Injecting wrangler.toml..."
ROUTE_LINE=""
if [ -n "${WORKER_ROUTE_PATTERN:-}" ]; then
  ROUTE_LINE="routes = [\"${WORKER_ROUTE_PATTERN}\"]"
fi
R2_BLOCK=""
if [ -n "$R2_BUCKET" ]; then
  echo "Ensuring R2 bucket: $R2_BUCKET"
  R2_LIST_JSON="$("$WR" r2 bucket list --json || echo '[]')"
  HAS_BUCKET="$(echo "$R2_LIST_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);const n=process.env.R2_BUCKET;const m=(Array.isArray(j)?j:[]).find(x=>x.name===n);process.exit(m?0:1)}catch(e){process.exit(2)}});' && echo yes || echo no)"
  if [ "$HAS_BUCKET" = "no" ]; then
    "$WR" r2 bucket create "$R2_BUCKET" || true
  fi
  R2_BLOCK="\n[[r2_buckets]]\nbinding = \"R2\"\nbucket_name = \"${R2_BUCKET}\""
fi
cat > "$BACKEND_DIR/wrangler.toml" <<EOF
name = "deepsight-api"
main = "worker.js"
compatibility_date = "2024-11-01"
$ROUTE_LINE

[[d1_databases]]
binding = "DB"
database_name = "${D1_DB_NAME}"
database_id = "${DB_ID}"
${R2_BLOCK}
EOF

echo "Deploying API Worker..."
pushd "$BACKEND_DIR" >/dev/null
  "$WR" deploy
popd >/dev/null

echo "Deploying Pages..."
"$WR" pages deploy "$FRONTEND_DIR/build" --project-name "$CF_PAGES_PROJECT"

if [ -n "${CF_PAGES_DOMAIN:-}" ]; then
  echo "Attaching custom domain to Pages: $CF_PAGES_DOMAIN"
  "$WR" pages domains add "$CF_PAGES_PROJECT" "$CF_PAGES_DOMAIN" || true
fi

echo "Done."
