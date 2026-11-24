# Operational completion — owner amendment, 2026-11-23

Base: demo1 c5018491defcd85d73e93483040382480901dae0. Source: [owner request](2026-11-23-owner-request.txt). This explicitly requested extension supersedes older exclusions only for the features listed here. Preserve modular ownership, integer VND, historical snapshots, append-only stock ledger, authorization and transactional audit.

## Confirmed owner policies

- Recovery uses a link sent to a verified email; never phone knowledge alone. Real delivery requires configured email infrastructure. Changing the email invalidates verification.
- INACTIVE categories (including their descendants) and brands hide/block new purchases of related Products, without preventing historical order or inventory operations.
- Issued Voucher terms are immutable; operators may enable/disable. Different terms require a new Voucher. Old Order snapshots never change.
- Slow-moving means positive stock and no completed sale in the last 10 days. Status rates use current statuses of Orders placed in the selected period; returned Orders count separately.

## Requirement and verification map

| ID | Feature | Owning modules | Required evidence |
|---|---|---|---|
| O01 | Stop sale versus retirement | product, inventory, order | Stock/open obligations block retirement; historical stock operations remain possible |
| O02 | Unavailable Cart lines | cart, product, frontend | Cart loads, marks invalid lines, allows removal; checkout rejects invalid lines |
| O03 | Price consent | order, frontend | Changed line prices/discount/shipping/total require fresh consent before any Order write; replay remains stable |
| O04 | Cancel failed delivery | order, inventory | Cancellation does not restock dispatched goods |
| O05 | Physical return receipt | order, inventory, frontend | Source-bound quantities/condition/disposition, sellable-only posting, no duplicate/over-receipt, rollback/race |
| O06 | Cancellation/failure reasons | order, audit, frontend | Bounded reason + actor/time survive reads without leaking private data |
| O07 | Adjustment direction | inventory, frontend | DAMAGE/LOSS negative; FOUND positive; count differences either direction |
| O08 | Same-member filter/price | product, frontend | One eligible SKU matches all Options and price, returned matching price/identity |
| O09 | Category/Brand visibility | product, cart, order, frontend | Hidden public metadata/products; reject new purchase; history preserved |
| O10 | Voucher effectivity/immutability | promotion, audit, frontend | Time/quota-derived usability, issued terms frozen, old snapshots stable |
| O11 | Supported permissions only | account, frontend | Flexible Roles but grants only map to implemented capabilities |
| O12 | Content lifecycle | content, frontend | Draft/preview/publish/unpublish/archive, authorization and responsive actions |
| O13 | Useful audit diffs | audit and command owners | Exact grant/price/term/item differences, bounded allowlist, private data redaction |
| O14 | Change password and email recovery | account, frontend | Current-password verification, hashed single-use expiring recovery tokens, verified email, enumeration-safe responses |
| O15 | Lock/unlock customer | account, audit, frontend | Scoped authorization, reason/actor/time, immediate token rejection, order history preserved |
| O16 | Correct confirmed receipt | inventory, frontend | Linked append-only correction, original immutable, stock/value deltas, dedupe/rollback |
| O17 | Physical stocktake | inventory, frontend | Saved count/variance/reason/confirmation; version conflict; one posting |
| O18 | Decision reports/drilldown | report, frontend | AOV, state rates, 10-day slow moving, explicit period/basis and contributing records |

## Technical choices

Implement one vertical slice at a time. New business persistence must be documented and tested; do not rewrite historical facts or reset persistent databases. New capabilities receive existing appropriate permission checks and SUPERADMIN retains all supported permissions. No unapproved role-to-permission assignment is inferred.

## Evidence

Implementation is complete for O01–O18. Real SMTP delivery for O14 remains a deployment prerequisite; the application does not substitute a weaker recovery channel.

| IDs | Implemented behavior and regression evidence |
|---|---|
| O01–O05 | [OperationalCompletionHttpTests](../../backend/src/test/java/com/fido/modules/order/OperationalCompletionHttpTests.java) covers stop-sale/retirement guards, historical/retired source handling, unavailable Cart removal, stale-price rejection before writes, failed-delivery cancellation, inspected returns, duplicate/racing receipt prevention and atomic rollback. [CheckoutCartTransactionTests](../../backend/src/test/java/com/fido/modules/order/CheckoutCartTransactionTests.java) retains checkout/retry/race coverage. |
| O06 | [OrderAuditPrivacyHttpTests](../../backend/src/test/java/com/fido/modules/order/OrderAuditPrivacyHttpTests.java) verifies saved reasons and redaction; the Order history API/UI exposes safe actor/time/change data. |
| O07 | [InventoryOperationalHttpTests](../../backend/src/test/java/com/fido/modules/inventory/InventoryOperationalHttpTests.java) rejects invalid adjustment signs before stock writes; [admin-ux](../../frontend/tests/admin-ux.mjs) checks inline correction and the resulting signed payload. |
| O08 | [DynamicCatalogHttpTests](../../backend/src/test/java/com/fido/modules/product/DynamicCatalogHttpTests.java) verifies simultaneous same-member option/price matching and returned matching Product identity/price. Cards navigate to that Product. |
| O09 | OperationalCompletionHttpTests checks purchase blocking without breaking old obligations. [CatalogMetaServiceTests](../../backend/src/test/java/com/fido/modules/product/service/CatalogMetaServiceTests.java) distinguishes filtered public metadata from complete admin metadata, including inactive ancestors. Browser regression exercises stop/reactivate and reload. |
| O10 | [OperationalManagementHttpTests](../../backend/src/test/java/com/fido/modules/order/OperationalManagementHttpTests.java) verifies issued-term immutability, effective time/quota status and unchanged Order snapshots. Admin browser regression verifies issued terms are disabled and only status is submitted. |
| O11 | [RbacHttpTests](../../backend/src/test/java/com/fido/modules/account/RbacHttpTests.java) and [RbacTransactionTests](../../backend/src/test/java/com/fido/modules/account/RbacTransactionTests.java) verify supported grants, flexible Roles, exact grant diffs and audit rollback. |
| O12 | OperationalManagementHttpTests and the operational browser regression cover draft creation, safe preview, publication, withdrawal, archive and authorization. |
| O13 | [AuditPayloadPolicyTests](../../backend/src/test/java/com/fido/modules/audit/service/AuditPayloadPolicyTests.java), RBAC tests, receipt tests and Order privacy tests verify meaningful allowlisted diffs while excluding credentials/private fields. Category/Brand status changes also retain before/after status. |
| O14–O15 | OperationalCompletionHttpTests verifies current-password proof, immediate JWT revocation, verified-email-only recovery, hashed/single-use/expired/email-bound links, customer lock/unlock and preserved Orders. Operational browser regression exercises both password journeys, email verification and customer status forms. Mail transport is mocked in tests; no real provider delivery is claimed. |
| O16–O17 | InventoryOperationalHttpTests verifies append-only correction chains, exact stock/value deltas, unchanged original receipts, insufficient-stock/stale-source rejection, saved physical counts, concurrent confirmation/corrections, intervening stock changes and audit rollback. Operational browser regression covers cost-only follow-up correction and counts retained across inventory pages. |
| O18 | OperationalManagementHttpTests verifies AOV/status denominators, source Order drilldown and the 10-day slow-moving boundary. Operational and [report browser regressions](../../frontend/tests/report-browser-smoke.mjs) exercise metrics, source links and responsive/error states. |

The [operational browser regression](../../frontend/tests/operational-completion-browser.mjs) runs the new journeys at 375px and 1440px, checks uncaught application/React errors and horizontal viewport overflow, and is included in `npm run test:browser`. Browser HTTP fixtures verify frontend behavior; they are separate from actual MySQL HTTP/transaction tests.

### Verification record — 2026-11-24, Asia/Ho_Chi_Minh

- Branch: `feature/demo1-operational-completion`; base SHA: `c5018491defcd85d73e93483040382480901dae0` (the selected `demo1` source). Verification applies to this branch's implementation, including the added files.
- Backend: `./gradlew --no-daemon --max-workers=3 formatJava test check`, JDK 17 and MySQL 8.4, with `TEST_DB_*` and `CLEAN_RESET_TEST_DB_*` pointing to disposable schemas. Passed: 477 tests, zero failures/errors/skips; Java formatting and `check` passed (3m 4s).
- Frontend: `npm run lint`, `npm run build`, `npm run test:api`, `npm run test:architecture`, `npm run test:render`, `npm run test:selection`, `npm run test:reports` passed. The API fixture binds port 8080, so stop the development backend during that one command and restart afterward.
- Browser regressions: all 17 programs in `npm run test:browser` passed, executed in two batches. The report test used `BROWSER_BASE_URL=http://localhost:5173` because the development Vite server was already running; leave port 5173 free or set this variable when reproducing. All new operational journeys passed at 375px/1440px.
- Static contract check: `python3 scripts/p1/check_contract_consistency.py` passed; V1 checksum/source remains unchanged and only approved V2–V4 extensions are accepted.
- Live smoke: backend health, catalog and frontend startup passed against persistent development MySQL/schema V4 without a database reset. Login/profile/Cart, complete admin metadata, inventory/customers/content, stocktakes and operational reports/drilldowns returned successful responses. Real-browser reads of reports, stocktake and Category management passed at 375px/1440px with the configured `http://localhost:5173` origin.
- The recovery endpoint consistently returns `503 EMAIL_DELIVERY_NOT_CONFIGURED` while SMTP is absent. Configure the deployment settings in [operational-api.md](operational-api.md#smtp-configuration-and-deployment) before enabling real email recovery; secrets stay outside Git.
