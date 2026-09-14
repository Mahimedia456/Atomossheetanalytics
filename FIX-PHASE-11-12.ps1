$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Mobile = Join-Path $Root "apps\mobile"

if (-not (Test-Path $Mobile)) {
    throw "apps\mobile was not found. Extract this ZIP into the Atomos project root."
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

Write-Host "Atomos Mobile Phase 11-12 FIX" -ForegroundColor Cyan
Write-Host "Repairing broken SDK 57 dependency tree + TypeScript files..." -ForegroundColor DarkCyan

Set-Location $Mobile

if (Test-Path "node_modules") {
    Write-Host "Removing broken node_modules..." -ForegroundColor Yellow
    Remove-Item "node_modules" -Recurse -Force
}

if (Test-Path "package-lock.json") {
    Write-Host "Removing incompatible package-lock.json..." -ForegroundColor Yellow
    Remove-Item "package-lock.json" -Force
}

Write-Host "Cleaning npm cache metadata..." -ForegroundColor Cyan
Invoke-Native npm cache verify

Write-Host "Installing pinned Expo SDK 57 dependencies..." -ForegroundColor Cyan
Invoke-Native npm install

Write-Host "Running TypeScript check..." -ForegroundColor Cyan
Invoke-Native npx tsc --noEmit

Write-Host "Running Expo Doctor..." -ForegroundColor Cyan
Invoke-Native npx expo-doctor@latest

Write-Host ""
Write-Host "FIX COMPLETE." -ForegroundColor Green
Write-Host "Now run:" -ForegroundColor Green
Write-Host "  cd apps\mobile"
Write-Host "  npx expo start -c"
