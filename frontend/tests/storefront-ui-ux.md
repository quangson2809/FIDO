# FIDO — Customer storefront verification

## Baseline and scope

- Base: `origin/feature/cart-checkout-voucher-improvements`, remote HEAD `6697fa037bc58914ce32b02e5abc833628246669`.
- Implementation branch: `feature/client-storefront-ui-ux-improvements`, created directly from that HEAD. Merge-base equals the recorded HEAD; initial worktree was clean.
- Inspected routes, feature hooks, services, DTOs, backend catalog/checkout/order/security contracts, existing tests and Actions workflows.
- No backend production changes, schema changes, Admin redesign, public cart APIs, guest checkout, sorting contract, invented size chart, address default persistence or payment/state-machine changes.
- Discoverable questions were resolved from code/contracts/tests. UI spacing, local SVG icons and dialog presentation are safe implementation choices. No unresolved material business/API decision was needed.

## Revalidated findings

| Finding | Classification at base | Implementation / preserved behavior | Primary files | Evidence |
| --- | --- | --- | --- | --- |
| UX-02 | CONFIRMED: mobile filter controls hidden | Scrollable native modal with every metadata filter, apply/reset (including unapplied drafts), close/Escape, focus trap/return; desktop sidebar retained | `CatalogScreen`, `CatalogBrowseSections`, `StorefrontDialog` | `catalog-browser.mjs`, mobile screenshots |
| UX-03 | IMPROVEMENT: query state not shareable or navigable | Validated/canonical URL is the applied query source; separate unapplied form draft, refresh/history/pagination, individual chips, clear all, backend count, actionable empty state | `useCatalogBrowse`, `catalogQuery` | URL/model assertions and catalog browser |
| UX-04 | CONFIRMED: incomplete modal keyboard behavior, decrement deletion, weak recovery | Native cart modal, 44px controls, scroll lock, focus return, explicit delete confirmation, quantity-one guard, pending feedback, last confirmed cart retained on failed mutation + reconciliation | `CartDrawer`, `CartProvider`, cart context | Keyboard, quantity, delete, concurrent failure/retry browser cases |
| UX-05 | CONFIRMED: implicit first saved address, technical copy, insufficient field validation/expiry UX | Explicit saved/new address choice; manual text retained; field errors with accessible links; backend quote totals, expiry timer and request/cart invalidation; uncertain order response guidance and same-quote retry | `CheckoutScreen`, `recipientValidation` | Address/voucher/expiry/network browser cases; existing checkout suite |
| UX-06 | CONFIRMED: STOPPED combination could retain a selected color; IMPROVEMENT: gallery | Size changes preserve only a compatible ON_SALE color; missing/stopped explanations; no replacement color selected. Existing effective-price/stock/backend guards retained; sorted thumbnails, zoom, image fallback | `ProductDetailScreen`, `ProductDetailSections`, catalog service | Full variant matrix, correct add payload, gallery/fallback browser |
| UX-07 | CONFIRMED: raw payment enum/time formatting | Exhaustive Vietnamese order/payment labels, existing Asia/Ho_Chi_Minh formatter, current-step progress and only real API timestamps; existing recipient edit permissions retained | Customer order screens, `orderLabels`, `CustomerOrderProgress` | All eight order statuses and three payment statuses; mobile order cards |
| UX-08 | CONFIRMED: missing retry, internal error copy, partial policy failure hidden; existing session lost on temporary `/me` error | Small feedback/image/dialog components with actual reuse; safe 401/403/404/server/network messages, recoverable reads, partial policy content, input/cart preservation, proper loading/alert roles. Existing-session verification retains credentials on network/server read errors while routes remain closed until retry succeeds; 401/403 still logs out | Customer screens, `QueryFeedback`, `storefrontError`, existing auth session/guards | Read/network retries, cart reconciliation, empty orders/catalog/cart, partial policies; startup session recovery and guard regressions |
| UX-09 | CONFIRMED: customer-facing implementation terms and icon-font words | Customer copy localized; SKU/COD/product data retained. Customer icons and shared informational toast use local SVGs, surviving external font failure | Customer screens, Header/Footer, `StorefrontIcon`, toast viewport | Render/browser checks and screenshot review |
| UX-10 | IMPROVEMENT | Scoped storefront tokens, readable small labels, 16px mobile fields, 44px buttons, visible dual-color focus treatment, selected/disabled controls, reduced motion, responsive layout | `index.css`, Header, customer sections | 10 pages + cart at 375/768/1024/1440; focus/touch/contrast assertions |
| UX-11 | CONFIRMED: external hero dependency; About ALREADY_FIXED | Local original FIDO illustration, honest illustration label, media fallbacks/lazy secondary images, working Catalog/About/Policies links, policy contents/retry. Existing About implementation/assets retained | Home, Policy, image helper; About unchanged | Home/About/Policies responsive/browser; About render/navigation smoke |

## Verification commands

Run from `frontend` on Node >=22:

```sh
npm ci
npm run lint
npm run build
npm run test:api
npm run test:architecture
npm run test:render
npx playwright install --with-deps chromium
npm run test:browser
```

`build` includes strict TypeScript (`tsc -b`). Playwright is an exact, development-only dependency so the pre-existing browser scripts and new suites run reproducibly in Actions; existing application dependency versions remain unchanged. If Chromium is already installed, set `CHROMIUM_EXECUTABLE_PATH` to that executable. No alternate browser-runtime package is installed in this repository.

The browser suites run the actual Vite application with isolated HTTP fixtures matching the existing snake_case contracts; they never write live customer accounts. Actions now runs all four suites and uploads `.browser-evidence`. The backend verification branch allowlist includes this branch, keeping H2/MySQL/Flyway/security/order regression verification on the implementation commit even though backend source is unchanged.

Coverage includes mobile filters, drafts/reset, all supported query fields and pagination/history, compatible/missing/stopped/out-of-stock variants, effective prices, gallery order/zoom/no/broken images, cart quantity/delete/keyboard/reconciliation failure, required login + redirect, saved/new address selection without auto-saving, field validation, eligible/ineligible voucher fixtures, quote expiry and invalidation, dialog cancellation, synchronous double click, successful cart sync, failed post-order cart refresh, and lost order-response retry using the same quote ID. The backend remains the authority for prices, availability, voucher eligibility and idempotency.

## UX and architecture review

- Customer route → feature/model/hook → existing service → centralized API client boundaries retained. Components do not introduce direct HTTP calls.
- Applied catalog state lives in URL; draft form data is explicitly unapplied, not a second query source. Saved address selection derives the recipient address; the manual address draft is retained separately.
- Small reused primitives only: dialogs (filters/cart/gallery), images (customer product/cart/order/home) and read feedback. No new UI/icon framework, unsafe type suppression or reversed feature dependency.
- Cart mutation queue, checkout lock, quote request keys, confirmation dialog, authenticated routes/session, account-scoped quote IDs and backend order deduplication remain in force. A confirmed startup UX bug is fixed in the existing session provider: a transient `/me` error no longer logs out. It remains in checking state with retry, and token-generation guards prevent stale profile reads from restoring a cleared/replaced session. No credential/session storage scheme, auth endpoint or authorization rule changes. Both route guards remain closed during unavailable verification; the shared guard recovery is not an Admin redesign.
- Order and payment status stay distinct. Progress marks current state only; no transition timestamp or completed history is fabricated.
- Visual screenshots reviewed for hierarchy, mobile spacing, clipping and external font failure. Important buttons have 44px targets; computed selected purchase-control contrast is checked against 4.5:1. This is targeted coverage, not a claim of a complete WCAG audit.
- Mobile sticky purchase action was considered but not added: the purchase panel remains in document flow with clear stock/price context and desktop sticky positioning. No reliable size-guide data exists in the inspected contract, so no chart/body measurements were invented.

## Evidence and limits

Screenshots in `evidence/storefront/` come from the real application, with deterministic fixture content, not mockups. `before-*` is the recorded detached base HEAD; `after-*` is the implementation working tree committed with these files. Full responsive screenshots are produced by each browser run and retained in its Actions artifact.

Browser acceptance uses Chromium and fixtures. A live deployed purchase, physical-device Safari/Firefox check and manual assistive-technology audit are not performed here. Existing external typography has system fallbacks; customer actions/icons/media no longer rely on a successful external icon-font/hero-image request. No claim of production readiness or exhaustive accessibility certification is made.

Final commit SHA, push result and exact-commit Actions links are recorded in the delivery report; screenshots and this verification record are versioned with the implementation.

## Local verification result

All required local checks passed: `npm ci`, lint, strict TypeScript/build, API integration smoke, architecture smoke and render smoke. All four browser suites passed against the implemented source, including the additional wrong-password, temporary session failure, 401/403 and stale profile response cases. Chromium was supplied through `CHROMIUM_EXECUTABLE_PATH` in the Work environment; CI installs Playwright's managed Chromium. No failed assertion remains unresolved. The final Actions result is verified separately on the pushed commit.
