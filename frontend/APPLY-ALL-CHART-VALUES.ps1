$ErrorActionPreference='Stop'
$root = (Get-Location).Path
if (!(Test-Path (Join-Path $root 'package.json'))) { throw 'Run in frontend project root (where package.json exists).' }
node (Join-Path $PSScriptRoot 'APPLY-ALL-CHART-VALUES.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Chart patch failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; restore from chart-values-backup folder.' }
Write-Host 'Build passed. Check values in browser before deploying.' -ForegroundColor Green
