# Product variant selection regression test

Run from `frontend` after `npm ci`:

```sh
node tests/product-variant-selection.mjs
```

The browser test uses an externally installed `playwright` package (verified with
1.62.1) resolved by Node, including `NODE_PATH`, and its Chromium browser. It does
not add dependencies to the application or change the lockfile. If these tools
are not already installed, provision a separate test-tools directory:

```sh
npm install --prefix /tmp/fido-test-tools --no-package-lock playwright@1.62.1
node /tmp/fido-test-tools/node_modules/playwright/cli.js install chromium
NODE_PATH=/tmp/fido-test-tools/node_modules node tests/product-variant-selection.mjs
```

An existing Chromium executable can be supplied with `CHROMIUM_EXECUTABLE_PATH`.
The test starts and closes Vite on port 5178. It exercises the real product route,
React event handlers, catalog service, authentication context and cart service,
with deterministic HTTP responses intercepted in the browser. It does not need
or modify a database and does not call the live backend.

Coverage:

- Initial default skips stopped/out-of-stock variants when an in-stock variant
  exists; preserves the first on-sale fallback when all stock is zero.
- Compatible size change retains color and resets quantity.
- Incompatible size change clears color, retains size, never selects a replacement,
  displays the required notice, selection prompt and reference-price label.
- All on-sale colors remain visible; incompatible/stopped combinations are disabled.
- Existing out-of-stock and stopped combinations retain the selected color and
  block purchase; stopped-only colors are not offered.
- Selecting a color clears the notice, resets quantity, and displays the matching
  effective price (both base-equivalent and override fixtures) and availability.
- Valid selection sends the exact `variant_id` and quantity to `/cart/items`.
- Incomplete, out-of-stock, stopped variant and stopped product states cannot send
  cart requests; an attempted native click on disabled controls has no effect.
- A product with no on-sale variants prompts for missing size/color and cannot buy.
- Browser runtime errors fail the test.

The backend is responsible for resolving override/base prices. This test verifies
that the UI consumes its `effective_price` without recomputing it.

## Verification record — 2026-10-08

Base: `fix/backend-confirmed-findings-20261007` at
`623121a5d6886fcf24b7132ec7623d102e609a03`.
Working branch: `fix/frontend-product-variant-selection`.

Passed: `npm run build`, `npm run lint`, `npm run test:architecture`,
`npm run test:render`, `git diff --check`, and the browser test above.
The browser run used Playwright 1.62.1 with a separately provisioned Chromium 153
executable through `CHROMIUM_EXECUTABLE_PATH`; the default browser CDN download
failed in the execution environment. No package manifest or lockfile changed.

Architecture review: screen owns selection events; panel owns presentation;
selected variant, price and stock remain derived from the catalog response.
The one added boolean records a color-clearing interaction for the notice (not
another copy of derived variant data). Existing purchase availability and cart
service boundaries remain intact. No backend, schema, API, shared state, HTTP
client, other screen or unsafe TypeScript escape was changed.

An existing stopped combination is still a matching variant, so changing size
retains the color, identifies the variant as stopped and blocks purchase. New
color choices require an on-sale combination. Stock alone does not disable a
compatible color choice. Initial variant selection is unchanged.

Contract checked against `PublicCatalogController`, `PublicCatalogQueryService`,
`ProductVariantDto`, frontend catalog DTO/service and cart service. Existing
conflict markers in `docs/05-dto-contract.md` were not modified; actual backend
DTOs resolve the contract needed for this change. Browser tests use HTTP fixtures,
not a live backend/database integration environment.
