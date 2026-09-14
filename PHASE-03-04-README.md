# Atomos Mobile — Phase 03 + 04

## Phase 03 — Live Home Dashboard
- Existing Atomos black/cyan branding retained.
- Permission-aware module cards.
- Live Ticket KPI sourced from the existing `/api/tickets` endpoint.
- Ticket sheet sync action and last-synced timestamp.
- Pull-to-refresh.
- Mahimedia Presented By branding retained.

## Phase 04 — Ticket Analytics
- Real `/api/tickets` report and `/api/tickets/sync` integration.
- Search and Region filters.
- Total Tickets and Top Region KPIs.
- Product-wise, Category-wise and Region-wise mobile horizontal charts.
- Recent ticket list with region colors.
- Ticket detail bottom sheet/modal.
- Pull-to-refresh and manual Google Sheet sync.
- Existing backend and web frontend are not replaced or modified.

## API
Default production API is `https://reportatomos.mahimediasolutions.com/api`.
Override with `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` when required.
