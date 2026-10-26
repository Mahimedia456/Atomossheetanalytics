# Global RMA StockStackValues missing-export hotfix

Cause: GlobalRmaPage.jsx imports StockStackValues, but the later shared VisibleChartValues.jsx no longer exported it.

This safe installer **appends only the missing export** to the existing component, without overwriting current chart or report code. It keeps the stock color-square + white-number display and produces a timestamped backup.

Extract at `E:\atomos-zendesk-analytics\frontend`, then:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\APPLY-STOCKSTACK-EXPORT-FIX.ps1
```

Requires existing `LabelList` import in `VisibleChartValues.jsx`. The script runs `npm run build` after patching.
