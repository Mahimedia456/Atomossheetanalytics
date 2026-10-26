# Atomos stacked stock chart — color square + white number

Run from **frontend project root**:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\APPLY-STOCK-SQUARE-NUMBERS.ps1
npm run build
```

This patch **does not overwrite** your GlobalRmaPage.jsx. It modifies only the `Stock Sent by Device Name` chart using exact anchors and backs up both files. It installs `src/components/VisibleChartValues.jsx` based on the previous Outside White patch. Applies to that named stacked chart only, not all other stacked charts. Requires the previous All Charts Values patch to be installed. Numeric labels appear **outside the full stack** as a small colored square followed by a white number; zero values are hidden. Tooltip remains unchanged.
