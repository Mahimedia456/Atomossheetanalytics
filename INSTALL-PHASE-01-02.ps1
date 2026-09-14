$ErrorActionPreference = "Stop"

Write-Host "Atomos Mobile - Phase 01-02" -ForegroundColor Cyan
Write-Host "This package adds apps/mobile only. Existing frontend/backend are untouched." -ForegroundColor DarkGray

$mobile = Join-Path $PSScriptRoot "apps\mobile"

if (-not (Test-Path $mobile)) {
  throw "apps\mobile was not found. Extract this ZIP into the Atomos project root."
}

Push-Location $mobile
try {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created apps/mobile/.env from .env.example" -ForegroundColor Yellow
  }

  Write-Host "Installing mobile dependencies..." -ForegroundColor Cyan
  npm install

  Write-Host "Running Expo Doctor..." -ForegroundColor Cyan
  npx expo-doctor@latest

  Write-Host "Phase 01-02 installed." -ForegroundColor Green
  Write-Host "Run: cd apps\mobile; npx expo start" -ForegroundColor Green
}
finally {
  Pop-Location
}
