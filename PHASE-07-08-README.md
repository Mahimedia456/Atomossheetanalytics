# Atomos Mobile — Phase 07 + 08

This checkpoint continues the existing Expo SDK 57 mobile app. The current Vite web frontend and Node/Express backend are preserved.

## Phase 07 — Rush RMA

- Live `/api/rma` reporting
- Google Sheet sync via `/api/rma/sync`
- Summary / US RMA / EMEA RMA tabs
- Search, Product and Month filters
- Actual RMA Replacement KPI
- D Stock Units Received KPI
- Total Queries KPI
- Pending to Ship / Receive KPIs
- Month-wise Actual RMA chart
- Product-wise Actual RMA horizontal chart
- Sent Out Summary
- Region-wise RMA for Summary
- Stock Received Summary
- Pending Summary and D Stock Received charts stay disabled, matching the current web checkpoint
- Mobile record cards + full detail sheet
- Pull-to-refresh and manual sync

## Phase 08 — Social Analytics

- Live `/api/social` reporting
- Google Sheet sync via `/api/social/sync`
- Search, platform and sentiment filters
- Total Queries / Products / Categories / Countries KPI cards
- Product-wise Social Queries
- Category-wise Social Queries
- Social Platform-wise Queries
- Customer Sentiments
- Social Platform Breakdown with Facebook, Instagram, Reddit, YouTube and generic platform icons/colors
- Latest-first social report records
- Query text in yellow
- Response text in Atomos cyan
- Positive / Neutral / Negative badges
- Mobile detail sheet
- Pull-to-refresh and manual sync

## Install

Extract into the Atomos project root and merge `apps/mobile`.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\INSTALL-PHASE-07-08.ps1
```

Start:

```powershell
cd apps\mobile
npx expo start
```

Default production API:

`https://reportatomos.mahimediasolutions.com/api`
