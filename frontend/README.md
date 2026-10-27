Atomos PDF: Exact chart data labels hotfix

Replace frontend/src/utils/dashboardPdfExport.js with src/utils/dashboardPdfExport.js

This fixes the previous patch accidentally interpreting X/Y-axis ticks (0, 55, 110, etc.) as chart data labels.
It now overlays only visible bold data labels at their actual on-screen glyph bounds, with the existing full-scroll, single-page PDF capture intact.
No web chart or page component changes.

Build:
cd E:\atomos-zendesk-analytics\frontend
npm run build

Browser/PDF visual verification is still required.
