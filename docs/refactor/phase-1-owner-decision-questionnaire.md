# FIDO Phase 1 — Owner Decisions for the 31-table Target Schema

- Date: 2026-10-22
- Repository: https://github.com/quangson2809/FIDO
- Target authority: [owner-confirmed 31-table ERD v2](phase-1-erd-v2-approved.mmd)
- Related documents: [target contract](phase-1-erd-v2-contract.md), [physical data dictionary](phase-1-physical-data-dictionary.md)

## Decision already confirmed — Clean Schema Reset

The owner has chosen **Clean Schema Reset**:

- Design the target schema for the new business contract, not to preserve the shape of obsolete development data.
- Discard old disposable development/test rows and reseed from scratch.
- Do not build a populated-source migration, historical ID crosswalk, legacy data archive, dual-write/cutover flow or per-field preservation mechanism solely for test data.
- This decision applies only to explicitly disposable local/development/test databases. It does **not** authorize dropping production, shared integration, staging or any environment containing real user/business data.
- No database has been reset by recording this decision. The current PR remains documentation-only.

This decision closes legacy-only questions about mapping old source values, old inventory, historical payment/refund aggregates, old image snapshots, source-only fields and old idempotency keys. They are not blockers for a clean target install.

## Implementation defaults adopted in branch `feature/clean-schema-reset`

To implement the selected scope without pausing for another decision round, the working branch uses these defaults: **D1-A, D2-A, D3-A, D4-A, D5-A, D6-A, D7-A, D8-A, D9-A, D10-A**. They are encoded as working defaults in the draft DDL/runbook; they are not presented as facts about the currently running application. Review before the new schema becomes the default runtime schema. Any rejection must be handled by updating the contract, DDL and tests together.

| Decision | Working default applied |
|---|---|
| D1 | Phone is unique login identity; email is nullable/non-unique. |
| D2 | New persisted carts/orders require authentication. |
| D3 | Parent/child Products share PRODUCTS; Size/Color are option-backed, variant-defining attributes. |
| D4 | Only target-representable vouchers; no persisted checkout quotes or scope-join tables. |
| D5 | VND; order total = subtotal − total discounts + shipping; each line snapshots its own discount and line total. |
| D6 | COD initially; one payment aggregate per order. |
| D7 | Copy recipient/address to an immutable order-address snapshot at placement. |
| D8 | Unique idempotency keys for new order/inventory commands; same-payload retry replays, conflicting payload returns conflict. |
| D9 | BIGINT IDs, DECIMAL(18,2), TIMESTAMP(6) UTC, checks/indexes and restrictive FKs by default. |
| D10 | Required roles/permissions in Flyway; demo catalog/inventory fixture separate from system seed and without accounts/secrets. |

## How to respond

Reply with any changes in the form `D5-OTHER: ...`. The defaults above are used to build the working branch, but must be changed before activation if they are inconsistent with the actual product contract. These questions concern the **new application's behavior and physical schema**, not obsolete development data.

## D1 — Account identity and phone login

The target ERD does not mark `ACCOUNTS.phone` or `email` unique, while the current implementation uses phone as the login identifier.

- **A — Recommended:** enforce physical `UNIQUE(phone)`; keep email non-unique unless a separate requirement says otherwise. Keep login lookup unambiguous and align validation/error behavior with the API contract.
- B: change login identity away from phone and explicitly define the replacement contract before DDL.
- C: defer authentication implementation until the account identity rules are supplied.

**Confirm:** A / B / C / OTHER.

## D2 — Guest carts and checkout

The target ERD has account-owned `CARTS` and `ORDERS`, and contains no guest-token/session table.

- **A — Recommended if the ERD is fixed:** require authentication before creating persisted carts/orders; update frontend/API behavior and acceptance tests accordingly.
- B: guest checkout is mandatory; revise the ERD and API first to model guest identity and secure order lookup explicitly.
- C: pause checkout implementation until the product owner decides.

**Confirm:** A / B / C / OTHER.

## D3 — Parent/child Product and typed attributes

The target uses one `PRODUCTS` table for parent and child rows, plus `ATTRIBUTE_TYPES`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS` and `PRODUCT_ATTRIBUTE_VALUES`.

- **A — Recommended:** Size and Color are typed option-backed attributes; explicitly mark them as variant-defining. Gender/season/style/material-care (if still part of the business) use typed attributes with controlled codes where appropriate and preserved display values. Define validation to prevent invalid parent/child structures and cycles.
- B: provide an owner-authored attribute matrix with code, data type, selectable options, variant-defining flag, and whether each attribute is inherited.
- C: revise the logical ERD before implementation.

**Confirm:** A / B / C / OTHER.

## D4 — Voucher and checkout scope

The target includes `VOUCHERS` and `ORDER_VOUCHER_SNAPSHOTS` but omits voucher-product/category link tables, a usage ledger and `CHECKOUT_QUOTES`.

- **A — Recommended if the ERD is fixed:** support only voucher rules representable in the target schema; explicitly define eligibility, limits, validation timing and order snapshot behavior. Do not depend on persisted checkout quotes or unrepresented targeting.
- B: scoped vouchers and persisted quotes are required; revise target ERD/API before implementation.
- C: defer voucher integration until the product behavior is clarified.

**Confirm:** A / B / C / OTHER.

## D5 — Order money semantics for new orders

The target has order-level totals and `ORDER_ITEMS.discount_amount`, plus `ORDERS.currency` and `placed_at`. Old order rows will not be migrated.

- **A — Recommended for the current single-market contract:** use VND; define `placed_at` as the instant the order is accepted/placed; define line discount as the discount attributable to that specific line, with order-level voucher/discount represented separately and totals validated by one documented formula.
- B: use another currency/time contract or place all discount logic at order level; supply exact formula and examples.
- C: block Order implementation until accounting rules are signed off.

**Confirm:** A / B / C / OTHER. If B, include an example with two lines and a voucher.

## D6 — Payment and shipping lifecycle

The target stores one `PAYMENTS` row per order and optional `SHIPPING_INFOS`; it has no payment-attempt, refund or shipment-event tables.

- **A — Recommended for current COD scope:** model one payment aggregate per order, use COD for the initial payment method, and define explicit payment/shipping status transitions with allowed actors. Do not represent multiple attempts/refunds/tracking history in tables that do not exist.
- B: multiple methods, retries, refunds or tracking events are mandatory; revise target ERD before implementation.
- C: defer Payment/Shipping implementation pending detailed state rules.

**Confirm:** A / B / C / OTHER.

## D7 — Address snapshot required for an order

The target separates account-owned `ADDRESSES` from order-time `ORDER_ADDRESSES`.

- **A — Recommended:** copy recipient and delivery address values into the order snapshot at placement; later edits to the account's address must not mutate historical orders. Validate required recipient name/phone and address fields before placing an order.
- B: define a different immutable order-address contract with exact nullable/required fields.
- C: defer checkout until the address contract is supplied.

**Confirm:** A / B / C / OTHER.

## D8 — Idempotency for new commands

The target marks `ORDERS.idempotency_key` and `INVENTORY_TRANSACTIONS.idempotency_key` unique. This decision concerns new runtime writes only; no old keys will be backfilled.

- **A — Recommended:** define request scope, key format, retention, payload conflict behavior and transaction boundary for order creation and inventory mutation. A retry with the same key and same logical payload returns the prior result; reuse with a conflicting payload returns a typed conflict.
- B: provide a different concrete key/retry policy.
- C: do not expose retryable write commands until this contract is approved.

**Confirm:** A / B / C / OTHER.

## D9 — Physical SQL contract

The ERD does not specify every column length, nullable constraint, default, timestamp precision, index, CHECK or FK delete action.

- **A — Recommended:** use BIGINT IDs, DECIMAL(18,2) for monetary values, TIMESTAMP(6) with an explicit UTC storage policy, bounded VARCHAR lengths based on API limits, explicit status checks where appropriate, useful query indexes, and restrictive FK deletion by default. Record exceptions in the physical dictionary before generating DDL.
- B: the owner provides a complete physical matrix.
- C: review each table's physical DDL individually before implementation.

**Confirm:** A / B / C / OTHER.

## D10 — Required system seeds versus development demo seed

A fresh target database needs a defined initialization path.

- **A — Recommended:** seed required role/permission/reference records through controlled migrations or a documented bootstrap task; keep demo accounts/catalog/orders in a separate development/test-only seed mechanism. Never place plaintext passwords or production credentials in source.
- B: provide the exact seed catalogue and approved bootstrap administrator mechanism.
- C: do not seed application/demo accounts automatically; define a secured first-admin setup flow.

**Confirm:** A / B / C / OTHER.

## What happens after the decisions

1. Update this decision record and the physical data dictionary; do not expand the 31-table ERD unless the owner explicitly approves an amendment.
2. Implement target-first Flyway DDL and system seeds. A clean baseline must be tested from an empty database.
3. Recreate only disposable development/test databases when the implementation replaces V1–V6 history; do not attempt to apply modified historical migrations to a database whose old Flyway history must be preserved.
4. Align Java entities/services and frontend API contracts with the target behavior.
5. Verify database constraints, seed/bootstrap behavior and application acceptance tests before considering merge.
