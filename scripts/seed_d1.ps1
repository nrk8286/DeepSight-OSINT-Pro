Param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dbName = if ($env:D1_DB_NAME) { $env:D1_DB_NAME } else { "deepsight_db" }
$isLocal = if ($env:D1_LOCAL) { $true } else { $false }

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $name"
  }
}

Require-Cmd "wrangler"

Write-Host "Applying schema to D1 ($dbName)..."
if (Test-Path (Join-Path $root "backend/schema.sql")) {
  if ($isLocal) {
    wrangler d1 execute $dbName --local --file (Join-Path $root "backend/schema.sql")
  } else {
    wrangler d1 execute $dbName --file (Join-Path $root "backend/schema.sql")
  }
} else {
  Write-Host "No schema.sql found; skipping schema apply."
}

Write-Host "Seeding sample data into D1 ($dbName)..."
if (Test-Path (Join-Path $root "backend/seed.sql")) {
  if ($isLocal) {
    wrangler d1 execute $dbName --local --file (Join-Path $root "backend/seed.sql")
  } else {
    wrangler d1 execute $dbName --file (Join-Path $root "backend/seed.sql")
  }
} else {
  Write-Host "No seed.sql found; nothing to seed."
}

Write-Host "Done."
