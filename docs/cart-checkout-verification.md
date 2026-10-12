# Cart reset and checkout confirmation — focused verification

Base: `feature/admin-ui-ux-improvements` at `88d1e1d599c309a85c47b16864f11fe41605ff83`.
Branch: `feature/cart-checkout-voucher-improvements`. Overall status: **PARTIAL** (material decisions below).

## Scope and design

Observed from repository code on 2026-10-09: `/checkout` called order creation directly; creation did not consume its cart. Voucher has only identifier/code; latest docs/12 and docs/15 still defer voucher and durable create-order dedupe.

Design: keep the FIDO storefront colors/typography and existing API service. A feature-owned native dialog separates reviewing a quote from creating an order; recipient, variant/quantity and all COD amounts precede cancel/confirm controls. Busy, stale quote, changed price, backend error and success are explicit states. Native modal focus/Escape behavior follows the existing Admin modal pattern without importing Admin-only styles. No external reference branding/assets or new production dependencies.

## Verification evidence

- Backend CI [run 37894757480](https://github.com/quangson2809/FIDO/actions/runs/37894757480), implementation commit `739c4fd3a7577ccb868ea0d5c956c6e65eeae5b7`: H2 `clean compileJava test check build` PASS; MySQL 8.4 `compileJava test check --rerun-tasks` PASS. Existing migration/clean-migrate tests run against isolated test databases.
- `CheckoutCartTransactionTests`: successful consumption; empty-cart repeat rejection; a separate subsequent purchase; rejection preserves cart; real duplicate-PK database failure rolls back order/payment/audit/cart; concurrent create/create; create/add quantity conservation; create/update cannot revive consumed items. Stock remains unchanged for PENDING creation.
- Local FE: `npm run build` (TypeScript + production build), `npm run lint`, `npm run test:api`, `npm run test:architecture`, `npm run test:render` PASS.
- Browser: `CHROMIUM_EXECUTABLE_PATH=<chromium> node tests/checkout-flow.mjs` with Playwright available in the execution environment. Mocked HTTP verifies real React interactions: open/cancel/Escape/focus return never POST; changed price requires reconfirmation; rejected order keeps cart; recipient edits invalidate quote; pending mutation blocks quote; double-click sends once; busy Escape is ignored; success resets header/cart and survives refresh; failed post-success cart read does not block success navigation. Dialog screenshots/overflow checks at 375/768/1440 px PASS.
- Browser tests are UI tests with mocked HTTP, not a live full-stack certification. External Material Symbols fonts were unavailable in the QA environment; surrounding pre-existing icon fallback layout is not certified. Screen-reader and full WCAG audit were not performed.
- Local Gradle execution is blocked by distribution download (`Network is unreachable`); backend claims above use actual GitHub CI evidence.

## Architecture review

- Structural: order orchestrates only module service contracts; cart owns locking/persistence; controllers/DTOs/schema/security are unchanged. No added abstract service, library, business state, foreign repository access or inventory side effect.
- Behavioral: account/current-cart lock precedes checkout reads and is retained through cart clear/order/payment/audit commit. FE queue drains before checkout, local mutations are excluded while processing, stale reads cannot overwrite newer cart state. Background cart reconciliation cannot turn an already-created order into an apparent failure.

## Material decisions still required

1. **BLOCKER — Voucher Customer/Admin:** discount type/value; validity window/minimum/applicability; global/per-customer limits and stacking; lifecycle and allocation; redemption/cancellation/retry semantics; management API/schema. No placeholder functionality was shipped.
2. **MAJOR — Quote-to-order guarantee:** approve a server-validated quote/version/token or equivalent contract. The extra API #19 comparison catches earlier changes, but changes between this request and API #20 remain possible. Do not call this atomic price consistency.
3. **MAJOR — Durable dedupe:** approve request identity, retention and replay/conflict semantics. Empty-cart rejection prevents repeated consumption of an unchanged cart, but cannot identify an old retry after new cart items have been added.
4. **NOTE — Guest flow:** existing authenticated-only flow is preserved; guest session/verification remains deferred.
