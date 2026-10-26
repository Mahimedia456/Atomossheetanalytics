$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'APPLY-FIX.cjs'
if (!(Test-Path '.\package.json')) { throw 'Run this script from frontend root (package.json folder)' }
node $script
if ($LASTEXITCODE -ne 0) { throw 'Patch refused: files unchanged.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed. Restore from ATOMOS_STACK_PDF_BACKUP_*; do not deploy.' }
Write-Host 'Build passed; test stacked chart and PDF locally before deployment.' -ForegroundColor Green
