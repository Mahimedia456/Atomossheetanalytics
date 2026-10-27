# Atomos as-is full-scroll PDF capture

Only `src/utils/dashboardPdfExport.js` is changed.

- Captures the page exactly as the browser's current HTML/SVG layout renders.
- Removes all earlier custom chart-value overlays and coordinate calculations.
- Does not force SVG overflow, freeze chart animation, or hide the document scrollbar.
- Hides existing `data-pdf-skip`, `data-pdf-hide`, `data-html2canvas-ignore`,
  `.no-print`, `.dashboard-filters`, `.export-actions` and `data-pdf-table` sections.
- Does not hide all buttons or selects across chart cards.
- Captures the entire report once into one long PDF page; no section pagination.
- Keeps chart tooltips, chart colors, labels, and page design untouched in source.

**Important:** This removes the *incorrect extra numbers* caused by earlier PDF
patches. It captures only what the screenshot engine can render from the actual
DOM. It does not synthesize missing labels. If a label is still missing from the
PDF, that is a separate SVG-to-image compatibility issue, not a reason to add
misplaced text overlays again.

## Install

Extract into frontend project root, replacing:
`src/utils/dashboardPdfExport.js`

Then:

```powershell
cd E:\atomos-zendesk-analytics\frontend
npm run build
```

Backup your current file before replacing. No report page or chart components
need to be overwritten.
