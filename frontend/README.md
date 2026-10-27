Fast single-page PDF export patch for Atomos dashboard.

Replace file:
  src/utils/dashboardPdfExport.js

What it does:
- Captures the visible report dashboard as one full-page image.
- Hides filters and tables in export.
- Keeps charts exactly as seen on screen, including visible values.
- Generates a single long PDF page instead of multiple split pages.
- Much faster than section-by-section rendering.
