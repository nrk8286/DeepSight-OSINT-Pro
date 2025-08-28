
Param(
  [Parameter(Mandatory=$true)][string]$Project,
  [Parameter(Mandatory=$true)][string]$Domain
)
wrangler pages domains add $Project $Domain
