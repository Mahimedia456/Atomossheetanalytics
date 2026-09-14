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

Write-Host "Atomos Expo SDK 57 Reanimated/Worklets Fix" -ForegroundColor Cyan
Write-Host "Pinning the SDK 57 compatible native pair..." -ForegroundColor DarkCyan

# Install the exact compatible pair together so npm does not keep
# react-native-reanimated 4.6.x from the old dependency tree.
Invoke-Native npm install react-native-reanimated@4.5.1 react-native-worklets@0.10.1 --save-exact

Write-Host "[1/3] TypeScript..." -ForegroundColor Cyan
Invoke-Native npx tsc --noEmit

Write-Host "[2/3] Expo Doctor..." -ForegroundColor Cyan
Invoke-Native npx expo-doctor@latest

Write-Host "[3/3] Expo Config..." -ForegroundColor Cyan
Invoke-Native npx expo config --type public

Write-Host ""
Write-Host "REANIMATED / WORKLETS FIX PASSED." -ForegroundColor Green
Write-Host "Now run:" -ForegroundColor Green
Write-Host "  cd apps\mobile"
Write-Host "  npx expo start -c"
