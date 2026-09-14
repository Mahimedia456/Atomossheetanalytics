$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Mobile = Join-Path $Root "apps\mobile"

if (-not (Test-Path $Mobile)) {
    throw "apps\mobile was not found. Extract this ZIP into E:\atomos-zendesk-analytics."
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & $FilePath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

Set-Location $Mobile

Write-Host "Atomos TS6 tsconfig fix" -ForegroundColor Cyan
Write-Host "No npm reinstall is required." -ForegroundColor DarkCyan

Write-Host "[1/3] TypeScript check..." -ForegroundColor Cyan
Invoke-Native npx tsc --noEmit

Write-Host "[2/3] Expo Doctor..." -ForegroundColor Cyan
Invoke-Native npx expo-doctor@latest

Write-Host "[3/3] Expo config..." -ForegroundColor Cyan
Invoke-Native npx expo config --type public

Write-Host ""
Write-Host "TS6 FIX PASSED." -ForegroundColor Green
Write-Host "Now run:" -ForegroundColor Green
Write-Host "  cd apps\mobile"
Write-Host "  npx expo start -c"
