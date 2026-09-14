# Atomos Mobile — Phase 11 + 12

This checkpoint continues the existing Atomos Expo mobile application. Web frontend and Node/Express backend remain untouched.

## Phase 11 — Offline Cache + Performance

- AsyncStorage-backed report cache added
- Tickets, Satisfaction, Global RMA, Rush RMA and Social report fetches cache successful API responses
- If the live API request fails, the same cached report/filter state is used automatically
- Cache metadata identifies live vs cached data
- Cached-data notice appears inside report screens
- Stale cache warning after 24 hours
- Global offline banner
- Network state refreshes when app returns to foreground and periodically while active
- User can clear offline report cache from Profile
- Existing SecureStore remains reserved for authentication/session and sync timestamps
- Full Sync architecture from Phase 10 remains intact
- Report screens still refresh after full sync without remounting the tab navigator
- Duplicate full sync requests remain deduplicated

## Phase 12 — Android/iOS Native Production Setup + QA

App metadata is now prepared for native builds:

- App name: `Atomos Reporting`
- App version: `1.0.0`
- Android package: `com.mahimediasolutions.atomosreporting`
- Android versionCode: `1`
- iOS bundle identifier: `com.mahimediasolutions.atomosreporting`
- iOS buildNumber: `1`
- Portrait orientation
- Dark UI
- Existing Atomos icon used for app/adaptive icon and splash
- Android edge-to-edge enabled
- Android keyboard uses resize mode
- Runtime version follows app version
- EAS development / preview / production profiles added
- Preview Android profile produces APK
- Production Android profile produces AAB
- iOS production profile included
- Production API example remains:
  `https://reportatomos.mahimediasolutions.com/api`

### Install

Extract this ZIP into the Atomos project root and merge `apps/mobile`.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\INSTALL-PHASE-11-12.ps1
```

### Run

```powershell
cd apps\mobile
npx expo start
```

### Verify

From project root:

```powershell
.\VERIFY-PHASE-11-12.ps1
```

The verifier runs:

1. `npm install`
2. `npx expo install --fix`
3. `npx tsc --noEmit`
4. `npx expo-doctor@latest`

### Prepare native projects

Only run this when you are ready to generate Android/iOS native folders:

```powershell
.\PREPARE-NATIVE-BUILD.ps1
```

### EAS preview APK

```powershell
cd apps\mobile
npx eas build --platform android --profile preview
```

### Android Play Store AAB

```powershell
npx eas build --platform android --profile production
```

### iOS production build

```powershell
npx eas build --platform ios --profile production
```

## Current mobile checkpoint

- Phase 01 Foundation
- Phase 02 Branding + Auth
- Phase 03 Home
- Phase 04 Ticket Analytics
- Phase 05 Satisfaction
- Phase 06 Global RMA
- Phase 07 Rush RMA
- Phase 08 Social
- Phase 09 Permissions + Profile
- Phase 10 Full Sync Architecture
- Phase 11 Offline Cache + Performance
- Phase 12 Native Production Setup + QA

Mobile project version: `0.12.0`
Native app version: `1.0.0`
