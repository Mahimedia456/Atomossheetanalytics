$ErrorActionPreference = "Stop"

& "$PSScriptRoot\VERIFY-PHASE-11-12-FIX.ps1"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
