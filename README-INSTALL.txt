Atomos filters and PDF final fix

New files:
- frontend/src/utils/dashboardPdfExport.js
- frontend/src/pages/reports/rma/GlobalRmaFilters.jsx
- frontend/src/pages/reports/rush-rma/RushRmaFilters.jsx
- frontend/src/pages/reports/social/SocialFilters.jsx

Updated pages:
- GlobalRmaPage.jsx
- RushRmaPage.jsx
- SocialPage.jsx
- TicketAnalyticsPage.jsx
- SatisfactionPage.jsx
- AgentPerformancePage.jsx

Fixes:
- Native working date picker with showPicker support
- Date From cannot exceed Date To
- Date To cannot be earlier than Date From
- Rush filters moved into a separate component
- Social filters moved into a separate component
- PDF root id is now placed on the actual page root, not inside a tooltip
- Shared PDF helper removes duplicate PDF code
- Black PDF background, one section/chart per page
- Filters, buttons, tabs and data tables remain excluded through data-html2canvas-ignore

Install once:
npm install html2canvas jspdf

Important backend note:
Rush RMA API must support query parameters dateFrom and dateTo.
Social API already uses fromDate and toDate in the provided page.
