$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'src\components\VisibleChartValues.jsx'
$fragment = Join-Path $root 'StockStackValues.export.jsx.txt'
if (!(Test-Path $target)) { throw "File not found: $target. Extract ZIP into frontend folder." }
if (!(Test-Path $fragment)) { throw "Fragment missing: $fragment" }
$content = [System.IO.File]::ReadAllText($target)
if ($content -match 'export\s+(?:function|const)\s+StockStackValues\b') {
  Write-Host 'StockStackValues export already exists; no changes made.' -ForegroundColor Yellow
} else {
  if ($content -notmatch 'LabelList') { throw 'LabelList not found: refusing to edit incompatible component.' }
  $backup = "$target.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item -LiteralPath $target -Destination $backup
  $patch = [System.IO.File]::ReadAllText($fragment)
  [System.IO.File]::WriteAllText($target, $content + "`r`n" + $patch, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Patched: $target" -ForegroundColor Green
  Write-Host "Backup: $backup"
}
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE). Backup is available." }
Write-Host 'BUILD PASSED' -ForegroundColor Green
