$ErrorActionPreference = "Stop"
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetRoot = $PatchRoot
$Patch = Join-Path $PatchRoot "src\utils\dashboardPdfExport.js"
$Target = Join-Path $TargetRoot "src\utils\dashboardPdfExport.js"
if (-not (Test-Path (Join-Path $TargetRoot "package.json"))) {
  throw "Extract the ZIP directly into the frontend root (where package.json is)."
}
if (-not (Test-Path $Patch)) { throw "Patch file missing." }
# ZIP extraction already places file at target path. Make backup before ZIP overwrite manually.
Set-Location $TargetRoot
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "Build succeeded. Test full-scroll PDF locally before deployment." -ForegroundColor Green
