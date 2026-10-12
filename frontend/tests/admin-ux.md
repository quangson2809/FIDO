# Admin UX verification

Base: `fix/frontend-product-variant-selection` at `2812a3d1dc5faf92f6835f1ea62b67b2a263c40a`.
Delivery branch: `feature/admin-ui-ux-improvements`.

## Checks

From `frontend`:

```sh
npm ci
npm run build
npm run lint
npm run test:architecture
npm run test:render
npm run test:api
node tests/admin-ux.mjs
node tests/product-variant-selection.mjs
```

Browser scripts require Playwright in the execution environment and Chromium. Set
`CHROMIUM_EXECUTABLE_PATH` when using an existing Chromium binary. Browser tooling
was provided outside this repository; no application dependencies were added.

The Admin browser suite intercepts API traffic with deterministic fixtures. It
covers repeated search, request races, retry/stale data, pagination, customer
modal failure, URL navigation, dirty forms, failed-save preservation, receipt
confirmation, variant selection, override prices, order/COD confirmation, staff
and role edits, forbidden access, and 19 routes at 1440/768/375px. Responsive checks
cover page overflow and labelled controls; screenshots supplement these checks.
The storefront suite covers variant selection and cart request regressions.
These are mocked browser journeys, not integration tests against a running backend.
No production data was mutated.

## Architecture review

- Requests continue through feature services and the existing HTTP client.
- Shared query lifecycle suppresses obsolete responses and exposes retry without
  retaining previous results as current results.
- Data-router initialization enables the router's supported navigation blocker;
  route definitions and authentication/authorization policies remain unchanged.
- Critical actions use server-supported operations; allowed order actions remain
  authoritative. Inventory movements and payment totals remain server-owned.
- New selectors use existing paginated inventory/supplier endpoints. Exact SKU
  search is labelled as such; no unsupported product-name search is advertised.
- Dirty form registration, query feedback, pagination and dialogs are shared only
  where reused. Admin visual styles are scoped to `.admin-ui`.
- No backend, API schema, RBAC policy or dependency changes.

## Limits

Report visuals use only the existing overview totals and status distribution;
there is no invented time-series API. IDs remain where responses provide no
human-readable identity. Validation with a real authenticated test backend and
its external image provider remains an integration-environment follow-up.
