# Atomos Mobile — Phase 01 + Phase 02

This package adds a new Expo mobile app at `apps/mobile` and does **not** modify the existing Vite frontend or Node/Express backend.

## Phase 01 — Foundation

- Expo Router + TypeScript foundation
- Dark Atomos theme tokens
- Existing backend API client
- SecureStore token/session persistence
- AuthContext with login, logout, `/auth/me`, roles and permissions
- Protected auth/tab routing
- Bottom navigation: Home, Tickets, RMA, Social, More
- Module placeholders ready for later report phases

## Phase 02 — Branding + Splash + Login

- Reuses the current Atomos brand mark/logo geometry
- Reuses current `favicon.png` as mobile icon/adaptive icon/splash artwork
- Reuses Mahimedia Solutions logo asset
- Premium black + cyan login UI aligned with current web dashboard
- Password visibility toggle, loading state and API error state
- JWT login against the existing Atomos backend
- Profile/role state and working logout

## API URL

Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://atomos-reporting.vercel.app/api
```

For local backend + Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

For a physical phone, use the PC LAN IP instead of `localhost`.

## Install

From the Atomos project root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\INSTALL-PHASE-01-02.ps1
```

Or manually:

```powershell
cd apps\mobile
Copy-Item .env.example .env
npm install
npx expo start
```

## Existing project safety

The package intentionally excludes `node_modules`, `.expo`, build output, frontend and backend source files.
