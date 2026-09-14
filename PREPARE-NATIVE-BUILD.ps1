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

Invoke-Native npx tsc --noEmit
Invoke-Native npx expo-doctor@latest
Invoke-Native npx expo prebuild --clean

Write-Host ""
Write-Host "Native projects generated successfully." -ForegroundColor Green
Write-Host "Preview APK: npx eas build --platform android --profile preview"
Write-Host "Production AAB: npx eas build --platform android --profile production"
Write-Host "iOS: npx eas build --platform ios --profile production"
