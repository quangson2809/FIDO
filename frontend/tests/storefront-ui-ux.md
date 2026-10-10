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

The browser suites run the actual Vite application with isolated HTTP fixtures matching the existing snake_case contracts; they never write live customer accounts. Actions runs all five suites, including follow-up recovery acceptance, and uploads `.browser-evidence`. The backend verification branch allowlist includes this branch, keeping H2/MySQL/Flyway/security/order regression verification on the implementation commit even though backend source is unchanged.

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

Screenshots in `evidence/storefront/` come from the real application, with deterministic fixture content, not mockups. Original `before-*` captures use the recorded detached base HEAD; original `after-*` captures document the first implementation delivered at `41ecb709818621eabe398dac3ecc4a1c276ab242`. Follow-up `review-before-*` captures use that exact detached revision and `review-after-*` captures use the supplemental working tree committed with them. Full responsive screenshots are regenerated by each browser run and retained in its exact-commit Actions artifact.

Browser acceptance uses Chromium and fixtures. A live deployed purchase, physical-device Safari/Firefox check and manual assistive-technology audit are not performed here. Existing external typography has system fallbacks; customer actions/icons/media no longer rely on a successful external icon-font/hero-image request. No claim of production readiness or exhaustive accessibility certification is made.

Final commit SHA, push result and exact-commit Actions links are recorded in the delivery report; screenshots and this verification record are versioned with the implementation.

## Local verification result

The first implementation passed `npm ci`, lint, strict TypeScript/build, API integration smoke, architecture smoke, render smoke and the original four browser suites. These checks did not cover all follow-up acceptance cases below; their green status was insufficient to establish completion. Chromium was supplied through `CHROMIUM_EXECUTABLE_PATH` in the Work environment; CI installs Playwright's managed Chromium. Exact final Actions results are verified separately on the pushed commit.

## Follow-up acceptance revalidation

Starting revision: `41ecb709818621eabe398dac3ecc4a1c276ab242`; base HEAD and merge-base are unchanged. Revalidation reproduced nine failing browser cases on that revision, plus both mouse-click and emulated-touch failures of the category disclosure. Valid unbroken product names and SKUs also exposed horizontal overflow (2049px document width at a 375px viewport). No new API, business rule, authentication mechanism, backend production change or dependency was needed.

| Criterion group | Gap reproduced / preserved | Supplemental result and coverage |
| --- | --- | --- |
| UX-02 | Mobile filter controls, drafts, apply/reset and focus still work; an invalid draft's error persisted after removing an applied filter | Clear obsolete validation when the URL query changes; mobile recovery regression plus original all-filter/browser coverage |
| UX-03 | `page=2147483648` was accepted and sent although the existing controller binds a Java Integer | Reject out-of-contract page values before HTTP/canonicalize to page 1 while preserving valid filters; model and browser assertions. Existing URL/history/search/paging coverage retained |
| UX-04 | Cart quantity-one guard, explicit deletion, queue/lock and failed-reconciliation recovery remain implemented | Original cart keyboard/mutation/recovery journeys retained; existing small dialog reused by confirmation rather than duplicating modal mechanics |
| UX-05 | Tab could leave confirmation; body scroll was not locked; expired quotes incorrectly reported changed recipient/cart | Preserve `CheckoutConfirmationDialog` and submit logic, reuse dialog focus/scroll/busy guards, identify quote expiry explicitly. Cancellation, double click, uncertain order response and purchased-cart synchronization regressions retained |
| UX-06 | Slow recommendations delayed primary product rendering; failed recommendations silently disappeared | Primary product and recommendations load independently; visible secondary error/retry does not reload the product or reset quantity/selection. Full size/color/stock/price matrix retained |
| UX-07 | Localized status/time/progress and recipient permissions already implemented | No production change needed; all eight order and three payment statuses, actual timestamps, read retries and mobile layouts remain covered |
| UX-08 | Home's shared Promise.all hid successful products when metadata failed, and successful categories when products failed; Catalog metadata retry also reloaded valid products; Policy retry discarded previously loaded content after a temporary failure | Independent existing query hooks with section-specific loading/error/retry; retries preserve the unaffected section in Home and Catalog. Policy keeps loaded content during loading/temporary failures, but removes it on 401/403/404. Profile and Order recovery mechanisms retained |
| UX-09 | Customer language already localized | No broad copy rewrite needed. Supplemental errors explain the affected content and expiry without internal implementation terms |
| UX-10 | Header Escape only worked after focus entered its panel; Home/recommendation JS scroll forced smooth motion despite reduced-motion preference; valid long text overflowed | Handle Escape on triggers; honor the existing Header matchMedia convention for both route actions; inherit overflow-wrap within the scoped storefront. Valid 255-character names and 100-character SKUs are checked on Home/Catalog/Product at all four widths, without hiding content. Original four-viewport/focus/touch/contrast coverage retained |
| UX-11 | Category disclosure opened on mouse-enter and immediately closed on click, including emulated touch | Use a predictable click/tap disclosure; assert open, actionable Catalog CTA and close after navigation for mouse and touch. Existing About content/local assets and policy links retained |

`storefront-recovery.mjs` contains fourteen acceptance cases. Request-count assertions compare before/after retry rather than assuming a single initial GET, because React development StrictMode runs mount effects twice. Initial follow-up assertions exposed this test assumption; it was corrected without changing production loading behavior. The original storefront expiry selector was narrowed to the confirmation alert after the accurate expiry message also appeared there; its disabled-submit assertion remains intact.

Structural review: existing `useRemoteQuery` handles request ownership; no new query/state framework or service transport was introduced. Unapplied filter draft and applied URL remain distinct. Confirmation remains its existing feature component and reuses an already-tested shared presentation primitive. No unsafe typing, backend total calculation, guest access, order mutation or persistence changes were introduced.

Verification scope: required local checks, fourteen supplementary acceptance cases, original journey suites and fresh four-viewport screenshots; complete frontend and backend Actions are required on the supplemental final commit. Live deployed purchase, physical Safari/Firefox and manual screen-reader/WCAG audit remain unperformed and are not represented by these Chromium fixtures.

Supplemental local results: `npm ci`, lint, strict TypeScript/build, API, architecture and render checks passed. All five browser suites passed across the implemented changes; after the final Catalog/Policy recovery edits, the affected Catalog/recovery suites (all fourteen cases), lint, render and build passed again. Unaffected service/model evidence was reused. The local Playwright CDN archive download was truncated; an isolated standalone Chromium 153 executable supplied through `CHROMIUM_EXECUTABLE_PATH` ran these checks without adding a repository dependency. Final Actions installs managed Chromium and independently reruns the complete suite on the pushed commit.
