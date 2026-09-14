$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Mobile = Join-Path $Root "apps\mobile"

if (-not (Test-Path $Mobile)) {
  throw "apps\mobile was not found. Extract this ZIP into the Atomos project root."
}

Write-Host "Atomos Mobile Phase 05-06" -ForegroundColor Cyan
Write-Host "Satisfaction + Global RMA" -ForegroundColor DarkCyan

Set-Location $Mobile

npm install

Write-Host ""
Write-Host "Phase 05-06 installed." -ForegroundColor Green
Write-Host "Run: cd apps\mobile; npx expo start" -ForegroundColor Green
