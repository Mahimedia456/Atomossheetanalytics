# Atomos Phase 11-12 — TS6 follow-up fix

The dependency reinstall already completed successfully. The remaining error is only:

`TS5101: Option 'baseUrl' is deprecated`

This patch removes `baseUrl` from `apps/mobile/tsconfig.json` and keeps the `@/*` path alias using `./src/*`.

No `npm install` or `expo install --fix` is needed again.

Extract into:

`E:\atomos-zendesk-analytics`

Then run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\FIX-PHASE-11-12-TS6.ps1
```

After it passes:

```powershell
cd apps\mobile
npx expo start -c
```
