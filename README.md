# Atomos Ionicons Type Fix

The current `@expo/vector-icons` Ionicons type set does not include:

`table-outline`

This patch replaces it with the supported:

`list-outline`

Affected screens:
- Tickets
- Satisfaction
- Global RMA
- Rush RMA
- Social

No npm reinstall is required.

Extract into:

`E:\atomos-zendesk-analytics`

Then run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\FIX-IONICONS-TABLE.ps1
```
