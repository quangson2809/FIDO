# P0 — Risk Register

Audited baseline: `demo1` at `22bd3d887cef3c077e714e5ec21e70ba89855d46` (2026-10-22).

Severity refers to impact if unresolved, not a claim that an incident occurred.

## BLOCKER — unresolved owner/business contract

### R-01 — HARD BLOCK — Product/API identity

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** `ProductVariant.java`, `CartItem.java`, `OrderItem.java`, Inventory source and current DTO/API contract use `variant_id`; target has no Variant table and uses child Products. `docs/04-api-contract.md` explicitly says ERD alone does not authorize API changes.
- **Impact:** Cart/order/inventory may reference wrong identifiers; breaking external API/FE contract.
- **Likelihood / observation:** Certain unless remapping is planned.
- **Control / mitigation:** Freeze external ID/DTO contract; test the complete shopping journey on target IDs.


### R-03 — HARD BLOCK — Inventory semantics

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1/P2/P3
- **Evidence:** Source `Inventory.available_quantity` is explicitly sellable availability; target uses composite `(warehouse_id,product_id)`, `quantity_on_hand`, `version`, no reservation.
- **Impact:** Wrong purchasability, overselling/double restoration or changed reporting.
- **Likelihood / observation:** High during rewrite.
- **Control / mitigation:** Freeze meaning/deduction timing; implement conditional/versioned updates and idempotent ledger; test MySQL concurrency and rollback.

### R-04 — HARD BLOCK — Voucher scope/limits

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** V5 creates `voucher_products`, `voucher_categories`, `voucher_usages`; `VoucherRedemptionService` uses these source rules and locking. Target omits scope joins and usage ledger.
- **Impact:** Product/category eligibility, global/customer caps and cancellation restore may be lost or weakened.
- **Likelihood / observation:** High if old service is reused unchanged.
- **Control / mitigation:** Define target-supported voucher capabilities and atomic usage enforcement; explicitly reduce contract or revise ERD through approved decision.

### R-05 — HARD BLOCK — Quote/idempotency

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** `CheckoutQuote` persists fingerprint, expiry, account and Order association; checkout tests cover same-quote replay, stale quote, cross-account use and rollback. Target removes quotes but requires unique `orders.idempotency_key`.
- **Impact:** Duplicate Orders or changed replay/conflict behavior.
- **Likelihood / observation:** High without key contract.
- **Control / mitigation:** Define key origin/scope, request binding, replay response, conflict for changed payload, expiry/retention; test concurrent create.

### R-06 — HARD BLOCK — Order snapshots

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Source `OrderItem` persists size/color and image URL snapshots; target only has `attribute_snapshot` and expressly excludes `image_url_snapshot`.
- **Impact:** Historical Order detail/list may lose current public behavior or mutate its meaning.
- **Likelihood / observation:** High if DTO stays unchanged.
- **Control / mitigation:** Agree retained snapshot contract and JSON schema/API output; do not add unapproved tables/columns.

### R-07 — HARD BLOCK — Payment/refund

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1
- **Evidence:** Source `Payment.java` stores due/received/refunded amounts and collector/refunder actor/times. Target Payment lacks refund aggregate/refunder attribution.
- **Impact:** Cannot preserve same refund auditability/amount semantics with target row alone.
- **Likelihood / observation:** Medium-high if refund remains supported.
- **Control / mitigation:** Decide supported refund lifecycle and whether approved audit data suffices; freeze API DTO behavior.

### R-08 — HARD BLOCK — Cancel/after-sales

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1
- **Evidence:** Source `Order.java` contains `customer_service_note`, `cancel_reason`, `completed_at`, `returned_at`; target Orders omits them and no separate return/timeline tables exist.
- **Impact:** Reasons/timing and after-sales behavior become unavailable or change.
- **Likelihood / observation:** Medium-high if APIs remain.
- **Control / mitigation:** Confirm intentional reduction and approved audit representation; preserve state-window and reporting tests.

### R-09 — HARD BLOCK — Shipping contract

- **Severity:** BLOCKER
- **Status:** OPEN
- **Owner phase:** P1
- **Evidence:** Source `ShippingInfo.java` contains `delivery_mode` and `carrier_name`; target has carrier/tracking/status/timestamps and no delivery_mode. Existing technical decisions leave mode literals TBD.
- **Impact:** Silent loss of delivery mode or Order/Shipping status mismatch.
- **Likelihood / observation:** Medium.
- **Control / mitigation:** Lock mode/status values, transitions and actors; map public DTO deliberately.

## HIGH — implementation and verification risks

### R-10 — TECHNICAL DECISION — Ledger idempotency/reason

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Source InventoryTransaction links Variant, Order/receipt, actor and reason. Target links warehouse/product and item rows with unique `idempotency_key`, but no reason column.
- **Impact:** Duplicate movement or less explainable adjustment history.
- **Likelihood / observation:** High if operation retries have no defined key.
- **Control / mitigation:** Define deterministic per-command key and reason audit mapping within approved table set; test uniqueness/rollback.

### R-11 — HARD BLOCK — Attribute/inheritance

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Target introduces ATTRIBUTE_TYPES, ATTRIBUTES, ATTRIBUTE_OPTIONS, PRODUCT_ATTRIBUTE_VALUES; source has fixed Product fields and size/color FKs. Data Dictionary leaves some typed-value/null/inheritance and physical details open.
- **Impact:** Invalid option/type, ambiguous inheritance, invalid parent cycles/SKU or filter results.
- **Likelihood / observation:** High during catalog rewrite.
- **Control / mitigation:** Approve attribute code/type/options/inheritance matrix; validate cycles and option/type compatibility.

### R-12 — TECHNICAL DECISION — Account/Cart constraints

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Draft target phone is NOT NULL+unique and carts/orders are account-owned; current login lookup, phone uniqueness versus ERD annotations, and API/entity integration remain open.
- **Impact:** Authentication/identity contract diverges or phone lookup becomes ambiguous.
- **Likelihood / observation:** Medium.
- **Control / mitigation:** Resolve the phone uniqueness decision against the ERD/API contract; verify login lookup, error contract, ownership tests and duplicate-phone behavior.

### R-13 — TECHNICAL DECISION — Audit PII

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Source audit is description/target-oriented; target has before/after JSON and correlation ID. Security doc requires audit of important actions without exposing private data.
- **Impact:** Missing audit facts or credentials/PII serialized into JSON.
- **Likelihood / observation:** Medium.
- **Control / mitigation:** Define allowlisted fields and redaction; test sensitive-change coverage and unauthorized reads.

### R-14 — TECHNICAL DECISION — Reports

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2/P3
- **Evidence:** Source business rules count COMPLETED + PAID as revenue and adjust returns; source report SQL depends on current fields. Target reshapes Order, Payment and Inventory.
- **Impact:** Silent revenue/return/stock-report drift.
- **Likelihood / observation:** High without query review.
- **Control / mitigation:** Map every report query and specify formula/status filters; test with representative order/payment/return datasets.

### R-15 — TECHNICAL DECISION — Content IDs/status

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2
- **Evidence:** Source `ContentPage` uses `page_code` and current publication representation; target uses `slug`/status. Current routes and DTO use pageCode/page_code.
- **Impact:** Public URL or publish visibility changes unexpectedly.
- **Likelihood / observation:** Medium.
- **Control / mitigation:** Preserve through an explicit adapter or approve/version a public contract change.

### R-17 — TECHNICAL DECISION — Dedicated target CI trigger

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** Follow-up CI phase
- **Evidence:** `.github/workflows/clean-reset-schema-verification.yml` pushes only on `feature/clean-schema-reset`, PRs into demo1 and manual dispatch; not on direct pushes to demo1. The dedicated target schema workflow has no run at the audited SHA.
- **Impact:** Target MySQL schema test is not automatically evidenced by a direct push to demo1; Vercel success must not be mistaken for backend/target schema success.
- **Likelihood / observation:** Certain trigger gap; dedicated run absent.
- **Control / mitigation:** Schedule/dispatch or alter the trigger in an approved CI follow-up; inspect exact-SHA logs. No workflow change was made in P0.

### R-20 — TECHNICAL DECISION — Exact-SHA backend test failure

- **Severity:** HIGH
- **Status:** OPEN
- **Owner phase:** P1/P2 verification follow-up
- **Evidence:** Backend verification run [#39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) is tied to baseline SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`; 196 tests completed, 3 failed, 1 skipped. All three failures are in `CleanResetSchemaTests` on H2 with `CK_CATEGORIES_STATUS`/`CK_ACCOUNTS_STATUS` reported invalid; MySQL step skipped.
- **Impact:** General backend CI remains red; exact cause and target DDL behavior on MySQL remain unproven.
- **Likelihood / observation:** Observed directly at audited SHA.
- **Control / mitigation:** Diagnose on a dedicated disposable MySQL test run and correct the authorized test/config path in a later implementation/verification task; do not dismiss as an assumed H2 incompatibility.

## MEDIUM — documentation/compatibility and deferred findings

### R-02 — CLOSED — Guest cart/order ownership decision; API metadata alignment remains

- **Severity:** MEDIUM
- **Status:** DECISION CLOSED / DOC ALIGNMENT OPEN
- **Owner phase:** P1 contract alignment
- **Evidence:** Owner decision dated 2026-10-05 in `frontend/CONTRACT_ALIGNMENT.md`: login is required before persisted Cart use or Order placement. Target `CARTS` and `ORDERS` are account-owned and have no guest-session model.
- **Impact:** Legacy JWT-optional/guest-TBD text may cause an implementation to reintroduce an unapproved guest flow.
- **Likelihood / observation:** Current stale documentation was found in the legacy 77-endpoint contract and chronological decision log; target decision itself is resolved.
- **Control / mitigation:** Target API #14–20 now records JWT-required access. Remove old “guest checkout required/TBD” statements from active target requirements; retain historical wording only with a superseded label. Do not add guest tables or identity mechanisms without an explicit amended owner decision.

### R-16 — TECHNICAL DECISION — Migration inventory gap (CLOSED)

- **Severity:** MEDIUM
- **Status:** CLOSED
- **Owner phase:** P0 audit
- **Evidence:** Recursive Git tree at `e63241d91f2dd4168bc837ade15eebfce5e2631c` is non-truncated and lists exactly V1–V6; V6 only inserts `REPORT_READ`.
- **Impact:** Original risk of omitting an active migration from the inventory is closed by repository-tree evidence.
- **Likelihood / observation:** N/A after verification.
- **Control / mitigation:** Keep exact six-file list and 32-table source count in P0 baseline report.

### R-18 — DEFERRED — Notifications/timeline

- **Severity:** MEDIUM
- **Status:** DEFERRED
- **Owner phase:** Deferred
- **Evidence:** Source API/business docs mark notification provider/template/retry and separate timeline resources as phase-later/TBD; no target tables.
- **Impact:** Unapproved schema expansion/scope creep.
- **Likelihood / observation:** N/A if excluded.
- **Control / mitigation:** Keep deferred unless owner changes scope.

### R-19 — DEFERRED — Automated integrations

- **Severity:** MEDIUM
- **Status:** DEFERRED
- **Owner phase:** Deferred
- **Evidence:** Source scope is COD and manual delivery; payment gateway and automatic shipping integration are outside scope. Tracking columns alone do not authorize integration.
- **Impact:** New external provider/security/config requirements are accidentally introduced.
- **Likelihood / observation:** N/A if excluded.
- **Control / mitigation:** Keep integrations out of P0/P1 without an explicit scope change.

## Overall risk judgement

Clean Schema Reset removes the need to preserve disposable development rows. Guest Cart/Order authentication is resolved as authenticated-only; the stale guest annotations are a documentation-alignment issue, not a reason to add guest storage. Remaining high-risk runtime-contract areas include public IDs, inventory meaning, voucher rules, quote/idempotency, snapshots/refunds, shipping state and report formulas.

No destructive action was performed.
