# Usage:
#   $env:WORKER_ORIGIN='https://deepsight-api.xxx.workers.dev'
#   $env:ADMIN_TOKEN='...'  # from wrangler secret or your local dev token
#   powershell -ExecutionPolicy Bypass -File scripts/test_admin.ps1

param()
$ErrorActionPreference = 'Stop'

if (-not $env:WORKER_ORIGIN) { Write-Error 'Set WORKER_ORIGIN (e.g., https://...workers.dev)'; exit 1 }
if (-not $env:ADMIN_TOKEN)   { Write-Error 'Set ADMIN_TOKEN to test admin endpoints'; exit 1 }

$headers = @{ 'Authorization' = "Bearer $($env:ADMIN_TOKEN)"; 'Content-Type' = 'application/json' }

Write-Host "GET /api/flags"
Invoke-WebRequest -UseBasicParsing -Uri ($env:WORKER_ORIGIN + '/api/flags') -Headers $headers -Method GET | Select-Object -ExpandProperty Content | Write-Output

Write-Host "PUT /api/flags"
$body = @{ rateLimit = @{ search = @{ limit = 30; windowSec = 60 } } } | ConvertTo-Json -Depth 5
Invoke-WebRequest -UseBasicParsing -Uri ($env:WORKER_ORIGIN + '/api/flags') -Headers $headers -Method PUT -Body $body | Select-Object -ExpandProperty Content | Write-Output

Write-Host "POST /api/images (sample)"
$sample = @{ id = 'admin-test'; url = 'https://example.com/img.jpg'; text = 'test' } | ConvertTo-Json -Depth 3
Invoke-WebRequest -UseBasicParsing -Uri ($env:WORKER_ORIGIN + '/api/images') -Headers $headers -Method POST -Body $sample | Select-Object -ExpandProperty Content | Write-Output

Write-Host "DELETE /api/images/admin-test"
Invoke-WebRequest -UseBasicParsing -Uri ($env:WORKER_ORIGIN + '/api/images/admin-test') -Headers $headers -Method DELETE | Select-Object -ExpandProperty Content | Write-Output

