
Param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"

function Require-Env([string]$name) {
  $val = [Environment]::GetEnvironmentVariable($name, 'Process')
  if (-not $val) { throw "Set $name" }
}

Require-Env "CLOUDFLARE_API_TOKEN"
Require-Env "CLOUDFLARE_ACCOUNT_ID"
Require-Env "CF_PAGES_PROJECT"
Require-Env "REACT_APP_API_ORIGIN"
if (-not $env:D1_DB_NAME) { $env:D1_DB_NAME = "deepsight_db" }
if (-not $env:R2_BUCKET) { $env:R2_BUCKET = "" }

function Invoke-Wrangler {
  param([Parameter(ValueFromRemainingArguments=$true)]$Args)
  & npx --yes wrangler@4 @Args
}

Write-Host "Building CRA in $frontend with REACT_APP_API_ORIGIN=$env:REACT_APP_API_ORIGIN"
if (-not (Test-Path (Join-Path $frontend "package.json"))) {
  throw "frontend/package.json not found"
}
Push-Location $frontend
  if (Test-Path "node_modules") {
    try { Remove-Item -Recurse -Force "node_modules" } catch {}
    npx rimraf node_modules | Out-Null
  }
  if (Test-Path "package-lock.json") { npm ci } else { npm install --legacy-peer-deps }
  bash (Join-Path $root "scripts/fix_ajv_build.sh") | Out-Null
  $env:REACT_APP_API_ORIGIN = $env:REACT_APP_API_ORIGIN
  npm run build
Pop-Location

Write-Host "Ensure D1 exists..."
$d1list = Invoke-Wrangler d1 list --json 2>$null
$uuid = ""
try {
  $arr = $d1list | ConvertFrom-Json
  foreach ($db in $arr) { if ($db.name -eq $env:D1_DB_NAME) { $uuid = $db.uuid; break } }
} catch {}
if (-not $uuid) {
  $created = Invoke-Wrangler d1 create $env:D1_DB_NAME --json
  try { $obj = $created | ConvertFrom-Json; $uuid = ($obj.uuid, $obj.id | Where-Object { $_ })[0] } catch {}
}
if (-not $uuid) { throw "Failed to resolve D1 database_id" }

if (Test-Path (Join-Path $backend "schema.sql")) {
  Invoke-Wrangler d1 execute $env:D1_DB_NAME --file (Join-Path $backend "schema.sql") | Out-Null
}

$routes = ""
if ($env:WORKER_ROUTE_PATTERN) { $routes = "routes = [`"$($env:WORKER_ROUTE_PATTERN)`"]" }
$r2block = ""
if ($env:R2_BUCKET) {
  Write-Host "Ensuring R2 bucket: $($env:R2_BUCKET)"
  try {
    $r2list = wrangler r2 bucket list --json 2>$null | ConvertFrom-Json
  } catch { $r2list = @() }
  $has = $false
  foreach ($b in $r2list) { if ($b.name -eq $env:R2_BUCKET) { $has = $true; break } }
  if (-not $has) { wrangler r2 bucket create $env:R2_BUCKET | Out-Null }
  $r2block = @"

[[r2_buckets]]
binding = "R2"
bucket_name = "$($env:R2_BUCKET)"
"@
}
@"
name = "deepsight-api"
main = "worker.js"
compatibility_date = "2024-11-01"
$routes

[[d1_databases]]
binding = "DB"
database_name = "$($env:D1_DB_NAME)"
database_id = "$uuid"
${r2block}
"@ | Set-Content -NoNewline (Join-Path $backend "wrangler.toml")

Push-Location $backend
  Invoke-Wrangler deploy
Pop-Location

Invoke-Wrangler pages deploy (Join-Path $frontend "build") --project-name $env:CF_PAGES_PROJECT

if ($env:CF_PAGES_DOMAIN) {
  Invoke-Wrangler pages domains add $env:CF_PAGES_PROJECT $env:CF_PAGES_DOMAIN
}
