$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Mobile = Join-Path $Root "apps\mobile"

if (-not (Test-Path $Mobile)) {
    throw "apps\mobile was not found."
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

Write-Host "Atomos Mobile UI Flow Update" -ForegroundColor Cyan

Invoke-Native npm install

Write-Host "[1/3] TypeScript..." -ForegroundColor Cyan
Invoke-Native npx tsc --noEmit

Write-Host "[2/3] Expo Doctor..." -ForegroundColor Cyan
Invoke-Native npx expo-doctor@latest

Write-Host "[3/3] Expo Config..." -ForegroundColor Cyan
Invoke-Native npx expo config --type public

Write-Host ""
Write-Host "UPDATE VERIFIED." -ForegroundColor Green
Write-Host "Run: cd apps\mobile; npx expo start -c"
