# Atomos PDF full-page chart labels fix

Replace `src/utils/dashboardPdfExport.js` in frontend. Preserves existing
single full-page PDF capture and copies all Recharts SVG text (including
pie, donut, horizontal and vertical bar value labels) into temporary HTML
overlays at the same screen coordinates during export.

Filters and tables remain hidden in the PDF. No chart page or backend files
are modified. After replacement run `npm run build` and test a PDF export.

The live dashboard is not modified after export: overlay and temporary styles
are cleaned up even on error. This is source-validated, not browser-verified.
