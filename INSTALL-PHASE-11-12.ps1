$ErrorActionPreference = "Stop"

Write-Host "This is the corrected Phase 11-12 installer." -ForegroundColor Cyan
& "$PSScriptRoot\FIX-PHASE-11-12.ps1"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
