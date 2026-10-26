param([string]$ProjectRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$src = Join-Path $PSScriptRoot 'src\components\VisibleChartValues.jsx'
$page = Join-Path $ProjectRoot 'src\pages\reports\rma\GlobalRmaPage.jsx'
$dest = Join-Path $ProjectRoot 'src\components\VisibleChartValues.jsx'
if (!(Test-Path $page)) { throw "Not found: $page. Run from frontend root or pass -ProjectRoot." }
if (!(Test-Path $dest)) { throw "Existing VisibleChartValues.jsx missing. Apply the previous All Charts Values patch first." }
$text = [IO.File]::ReadAllText($page)
$oldImport = 'import { Bar, Pie, Line } from "../../../components/VisibleChartValues.jsx";'
$newImport = 'import { Bar, Pie, Line, StockStackValues } from "../../../components/VisibleChartValues.jsx";'
if (!$text.Contains($oldImport) -and !$text.Contains($newImport)) { throw 'Chart component import is different; no changes made.' }
$begin = $text.IndexOf('title="Stock Sent by Device Name"')
if ($begin -lt 0) { throw 'Stock Sent chart not found; no changes made.' }
$end = $text.IndexOf('</BarChart>', $begin)
if ($end -lt 0) { throw 'Stock Sent closing tag missing; no changes made.' }
$segment = $text.Substring($begin, $end - $begin)
if ($segment.Contains('<StockStackValues')) { Write-Host 'Stock chart already patched; keeping existing page.' -ForegroundColor Yellow; exit 0 }
$checks = @('dataKey="RStock"','dataKey="BStock"','dataKey="OtherStock"','margin={{ top: 15, right: 35, left: 40, bottom: 20 }}')
foreach ($check in $checks) { if (!$segment.Contains($check)) { throw "Expected chart anchor missing: $check. No changes made." } }
# Scope the modifications to exactly ONE chart.
$segment = $segment.Replace('margin={{ top: 15, right: 35, left: 40, bottom: 20 }}','margin={{ top: 15, right: 225, left: 40, bottom: 20 }}')
foreach ($key in @('RStock','BStock','OtherStock')) {
  $needle = 'dataKey="' + $key + '"'
  $replacement = $needle + "`n              showValueLabels={false}"
  if ($segment.Contains($replacement)) { continue }
  $segment = $segment.Replace($needle, $replacement)
}
$barEnd = @'
              maxBarSize={28}
            />
'@
# Modify only the final bar, which closes the stacked chart.
$last = $segment.LastIndexOf($barEnd)
if ($last -lt 0) { throw 'Final Stock bar closing block mismatch. No changes made.' }
$segment = $segment.Substring(0, $last) + @'
              maxBarSize={28}
            >
              <StockStackValues />
            </Bar>
'@ + $segment.Substring($last + $barEnd.Length)
$newText = $text.Substring(0, $begin) + $segment + $text.Substring($end)
$newText = $newText.Replace($oldImport, $newImport)
$backup = Join-Path $ProjectRoot ('ATOMOS_STACK_BACKUP_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $page (Join-Path $backup 'GlobalRmaPage.jsx')
Copy-Item $dest (Join-Path $backup 'VisibleChartValues.jsx')
[IO.File]::WriteAllText($page,$newText,[Text.UTF8Encoding]::new($false))
Copy-Item $src $dest -Force
Write-Host 'Patch applied to Stock Sent by Device Name chart only.' -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host 'Run: npm run build'
