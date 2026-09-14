# Atomos Mobile — Phase 09 + 10

This checkpoint continues the existing Expo SDK 57 application and keeps the current Vite frontend and Node/Express backend intact.

## Phase 09 — Permissions + Profile

- Central permission aliases for Tickets, Global RMA, Rush RMA, Satisfaction, Social and Agent Performance
- Admin automatically receives access to all current mobile reporting modules
- Viewer tabs are hidden when the account does not have the matching permission
- Report routes also have a permission guard, so direct navigation cannot bypass access rules
- Home cards are permission-aware
- More screen is permission-aware
- Dedicated Profile screen
- Profile shows account name, email, role, ID, permissions and app version
- Last mobile sync timestamp appears in Profile
- Secure logout redirects back to login

## Phase 10 — Full Mobile Sync Architecture

- New central `DashboardSyncProvider`
- Automatic full sync after authenticated session hydration/login
- Only modules the current account can access are synced
- Home manual "Sync All" action
- Pull-to-refresh on Home performs a full accessible-module sync
- More screen also exposes full mobile sync
- Last full sync timestamp persisted using Expo SecureStore
- Per-module sync success/failure summary
- Concurrent duplicate full-sync requests are deduplicated
- Global `syncVersion` notifies mounted report screens after successful sync
- Mounted report screens reload their report data without remounting the whole tab navigator
- Existing local per-report pull-to-refresh and manual sync remain intact
- Production API remains:
  `https://reportatomos.mahimediasolutions.com/api`

## Install

Extract this ZIP into the Atomos project root and merge `apps/mobile`.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\INSTALL-PHASE-09-10.ps1
```

Then:

```powershell
cd apps\mobile
npx expo start
```

## Checkpoint

Mobile version: `0.10.0`

Completed mobile phases:
- 01 Foundation
- 02 Branding/Auth
- 03 Home
- 04 Ticket Analytics
- 05 Satisfaction
- 06 Global RMA
- 07 Rush RMA
- 08 Social
- 09 Permissions/Profile
- 10 Full Sync Architecture
