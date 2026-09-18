## Why

The system should display renewal status on the tenant list.

## What Changes

- Add renewal status to the tenant list.

## Impact

- Update `TenantList` on the tenant list page.
- Keep `TenantCheckOutPact` in scope.

## Out of scope

- Do not modify `LegacyExport.js` or `NoiseUtil.ts`.
- Do not fix `TenantCheckOutPact.loadDynamicHeaders`.
