Atomos PDF Chart Value Fix (vector text)

Replace: src/utils/dashboardPdfExport.js

Unlike the previous HTML overlay, this patch reads numerical Recharts SVG labels
before capture and draws those exact values as white vector text ON TOP of the
full-page PDF snapshot using jsPDF. It does not alter the web chart design,
PDF full-page format, filters, or tables.

Test: npm run build, then export Global RMA PDF.
Open browser console for [Atomos PDF] Found N chart value labels.
If N is 0, chart values are not SVG <text> elements; share a current chart
component source for exact renderer targeting.
