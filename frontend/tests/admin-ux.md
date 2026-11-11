# FE-P5 Admin browser acceptance

This test is included in `npm run test:browser` and runs from the integrated frontend verification workflow after dependencies and Chromium are installed.

## Coverage

`tests/admin-ux.mjs` uses deterministic HTTP fixtures. It covers Admin Customer search/retry and request races, catalog navigation/history, content dirty-state preservation, current inventory adjustments using reason code, source operation ID and expected version, goods receipt dirty-state protection and confirmation, Product PATCH payload preservation, order/COD actions, staff and role editing, denied access, responsive page overflow and input labels.

The separate Admin Product and Attribute/Option browser tests run in the same suite. The storefront suite exercises customer Product, Cart and checkout flows. Tests intercept HTTP and do not prove connectivity to a live Backend or database.

## Acceptance constraints

- Inventory rows use Product ID and the returned version; adjustment writes use Backend-approved reason codes, `source_operation_id`, and `expected_version`.
- Goods receipts expose Product ID, `quantity_received` and unit cost and permit state actions only for drafts.
- Supplier DTOs use `code` and `status`; the current API does not expose the retired address/note fields.
- Product/Cart/checkout acceptance follows the current Product-centric contract, not the retired size/color variant flow.

Run the complete CI workflow for current lint, typecheck/build, API, architecture, render and browser results. Results from previous branches are historical and are not current acceptance evidence.
