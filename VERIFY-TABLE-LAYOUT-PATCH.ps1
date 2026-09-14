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

Write-Host "Atomos table-layout preservation patch" -ForegroundColor Cyan
Write-Host "No npm install is required." -ForegroundColor DarkCyan

Write-Host "[1/2] TypeScript..." -ForegroundColor Cyan
Invoke-Native npx tsc --noEmit

Write-Host "[2/2] Expo config..." -ForegroundColor Cyan
Invoke-Native npx expo config --type public

Write-Host ""
Write-Host "TABLE LAYOUT PATCH VERIFIED." -ForegroundColor Green
Write-Host "Run: cd apps\mobile; npx expo start -c"
