# Stock stacked chart + PDF layout correction

Apply **over your current source**; no full report page overwrite.

- Removes duplicate numeric labels appearing inside and above stacked segments.
- Places a single line of `colored square + white value` labels to the right of each entire Stock Sent by Device Name stacked bar.
- Preserves hover, chart colors, chart data and report layout.
- Removes the earlier PDF SVG-to-HTML label mirroring invocation that can duplicate/offset chart text in export.
- Backs up all three affected original files before modification.

Run from frontend root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\APPLY-STACK-PDF-FIX.ps1
```

The patch intentionally aborts if the stock chart source has an unexpected structure. It does not claim a browser/PDF validation.
