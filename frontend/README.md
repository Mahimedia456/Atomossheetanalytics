# Atomos PDF actual chart data-label repair

Replace `src/utils/dashboardPdfExport.js` in your frontend root.

The previous vector overlay was drawing text after the screenshot with separate PDF coordinates. This version reads the real on-screen Recharts data-label SVG text elements and paints them into the captured image at their measured screen positions before jsPDF receives it.

- Captures labels such as `USA: 697`, `EMEA: 624`, `Replaced: 764`, and bar-end count labels.
- Excludes the X/Y axis ticks.
- Does not change the dashboard charts or hover tooltips.
- Keeps the existing single long page, filters hidden and table-skipping behavior.
- Logs `[Atomos PDF] Chart data values found: N` in browser console.

This code was syntax checked but the production browser render cannot be verified here. If N=0, the running page contains no matching SVG data labels at capture time and needs a page-specific chart inspection.
