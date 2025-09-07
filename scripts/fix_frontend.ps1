param([string]$FrontendPath)

if (-not $FrontendPath) { Write-Error "Frontend path required"; exit 1 }
$fp = Resolve-Path $FrontendPath

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process "react-scripts" -ErrorAction SilentlyContinue | Stop-Process -Force

npm cache clean --force | Out-Null

Try { Remove-Item "$fp\package-lock.json" -Force -ErrorAction SilentlyContinue } Catch {}

try { icacls "$fp\node_modules" /grant "$($env:USERNAME):(OI)(CI)F" /T /C | Out-Null } catch {}

try { npx --yes rimraf "$fp\node_modules" 2>$null } catch {}
if (Test-Path "$fp\node_modules") { cmd /c "rd /s /q `"$fp\node_modules`"" }

npm config set fetch-retries 5 | Out-Null
npm config set fetch-retry-maxtimeout 120000 | Out-Null
npm config set prefer-online true | Out-Null

Push-Location $fp
$env:HUSKY="0"
$env:CI=""
if (Test-Path ".\package-lock.json") {
  npm ci --no-audit --fund=false --no-optional --cache "$env:LOCALAPPDATA\npm-cache"
} else {
  npm install --legacy-peer-deps --no-audit --fund=false --no-optional --no-bin-links --cache "$env:LOCALAPPDATA\npm-cache"
}
npm rebuild
Pop-Location
