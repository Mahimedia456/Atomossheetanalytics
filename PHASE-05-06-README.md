# Atomos Mobile — Phase 05 + 06

This checkpoint continues the existing Expo SDK 57 mobile app. The web frontend and Node/Express backend are not replaced.

## Phase 05 — Satisfaction

- Live `/api/satisfaction` report integration
- Google Sheet sync via `/api/satisfaction/sync`
- Search and Good / Bad filtering
- Total Responses, Good and Bad KPI cards
- With Comments vs Without Comments chart
- Category chart
- Latest-first response cards
- Good comments in Atomos cyan
- Bad comments in red
- AI `View Summary` using `/api/ai/satisfaction/analyze`
- Pull-to-refresh and manual sync
- Permission-aware entry from More

## Phase 06 — Global RMA

- Live `/api/global-rma` report integration
- Google Sheet sync via `/api/global-rma/sync`
- Region and year filters
- Total / USA / EMEA / Replaced / Repaired / D Stock KPI cards
- USA vs EMEA distribution
- RMA Status
- Action Taken
- Customer Channel
- Product High / Low trend
- Fault Category High / Low trend
- Year and Category donut cards
- Stock Received vs Stock Sent
- Global RMA record cards and full detail sheet
- Mobile table/detail terminology aligned with the current web checkpoint:
  - `Date` = Entry Date
  - `Processed Date` = RO RMA Processed Date
  - Year and INW/OOW are not shown as record-table fields
  - Customer Return Tracking appears at the end of details

## Install

Extract this ZIP into the Atomos project root so `apps/mobile` merges with the existing mobile app.

Then run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\INSTALL-PHASE-05-06.ps1
```

Start:

```powershell
cd apps\mobile
npx expo start
```

Default API:

`https://reportatomos.mahimediasolutions.com/api`

Override it with `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://reportatomos.mahimediasolutions.com/api
```
