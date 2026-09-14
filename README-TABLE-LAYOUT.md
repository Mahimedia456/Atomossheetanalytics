# Atomos Mobile — Preserve Original Record Layouts

This patch changes only the dedicated report table screen.

The dedicated screen now preserves the same record/card presentation
that was already used on each report page before records were moved:

- Tickets: ticket number, region badge, subject, date, product
- Satisfaction: ticket, Good/Bad badge, date/category, comment, AI Summary
- Global RMA: RMA number, region badge, product, dates, fault
- Rush RMA: product, region badge, month, description, RMA/query values
- Social: platform/icon, date, sentiment, product, query, response, category

The separate screen still keeps the proper Back header and pull-to-refresh.
No generic field-by-field table/card design is used anymore.

Extract into:
`E:\atomos-zendesk-analytics`

Then run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\VERIFY-TABLE-LAYOUT-PATCH.ps1
```
