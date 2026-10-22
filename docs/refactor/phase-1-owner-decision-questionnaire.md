# FIDO Phase 1 — Owner Decision Questionnaire for ERD v2 blockers

- Date: 2026-10-22
- Applies to: owner-confirmed 31-table ERD v2 only
- Related documents: \`phase-1-erd-v2-approved.mmd\`, \`phase-1-erd-v2-contract.md\`, \`phase-1-physical-data-dictionary.md\`
- Purpose: capture owner decisions that affect schema semantics, data preservation and cutover. This is not approval to run a migration.

## How to respond

Reply with the option codes, for example:

\`Q1-A, Q2-A, Q3-C, Q4-A, ...\`

You may say **“Approve all recommended options”** and list any exceptions. Choices marked **Recommended** are proposals, not decisions until the owner confirms them. If no option is acceptable, answer \`Qn-OTHER: ...\`.

## Questions

### Q1 — Account phone and login identity

The existing app logs in by phone and Flyway V2 applies UNIQUE(phone). The target ERD does not mark phone/email as unique.

- **A — Recommended:** preserve UNIQUE(phone) in the physical target schema as a security/login invariant; email remains non-unique unless separately approved. Document that this physical constraint does not add a table or change the 31-table model.
- B: remove UNIQUE(phone) and explicitly change the login identity/API contract before migration.
- C: block migration until a different account identity strategy is designed.

**Confirm:** A / B / C / OTHER.

### Q2 — Target-only account/cost fields with no trusted source value

The source does not provide a reliable \`accounts.full_name\`, \`products.cost_price\` or \`goods_receipt_items.unit_cost\`.

- **A — Recommended:** preserve those values as unknown/NULL for legacy rows where physical nullability permits; do not derive a name from email/phone or pretend selling price is purchase cost. New account creation may require full_name at the API level.
- B: provide an approved external source and a field-specific import mapping.
- C: block those rows/entities until an authoritative value is available.

**Confirm:** A / B / C / OTHER.

### Q3 — Guest carts and guest orders

The source/API supports guest intent, but the target ERD models CARTS and ORDERS as account-owned and has no guest-token/session table.

- A: preserve the exact target ERD by requiring authentication for new target carts/orders; keep historical unowned carts as disposable only if their retention is approved, and retain guest orders in a segregated read-only legacy archive.
- **B — Recommended for exact 31-table scope and data preservation:** archive unowned carts, archive guest orders without attaching them to a fictitious account, and change the checkout flow to require an account at cutover. This is an explicit business/API behavior change that must be scheduled and communicated.
- C: guest checkout is mandatory; pause target migration and request an explicit ERD/API scope change to represent guest identity without fabricated accounts.

**Important:** do not insert a fake “Guest” account to make the FK pass unless you explicitly approve that identity model.  
**Confirm:** A / B / C / OTHER.

### Q4 — ProductVariant-to-child-Product and attribute mapping

Each legacy Variant must receive a newly allocated Product ID. The target uses one PRODUCTS table plus typed attributes.

- **A — Recommended:** create one child PRODUCTS row per old Variant with parent_product_id pointing to its old parent Product; map Size and Color to stable option-based attributes marked variant-defining; map gender/season/style/material_care to typed attributes preserving exact source strings. Keep a source-to-target crosswalk. Never reuse variant_id as the new product id.
- B: preserve additional source attribute distinctions in an owner-supplied attribute mapping matrix before approving the conversion.
- C: change the target attribute model before migration.

**Confirm:** A / B / C / OTHER. If B, name any fields that must be modeled differently.

### Q5 — Slugs and supplier codes absent from source

Source Category/Brand/Product tables have no slug fields; Suppliers have no code. Target marks Category/Brand/Content slugs and supplier code unique; Product SKU is unique, while Product slug is not marked unique.

- **A — Recommended:** generate deterministic slugs from names using one documented normalization rule; add a stable source-ID suffix to resolve collisions for fields marked unique. For old suppliers generate an explicitly technical code such as \`LEGACY-SUP-{supplier_id}\`. Keep the generated-to-source mapping in the migration crosswalk.
- B: supply authoritative slugs and supplier codes externally before migration.
- C: block only entities whose slug/code cannot be generated collision-free.

**Confirm:** A / B / C / OTHER.

### Q6 — Mapping source available_quantity to target quantity_on_hand

The source stores one available_quantity per Variant; the target stores quantity_on_hand per Warehouse/Product and has no reservation table or quantity_reserved column.

- **A — Recommended, conditional:** use current available_quantity as initial quantity_on_hand only after verifying every Variant has a stock row, reconciling balances against available ledger/order/receipt evidence, and documenting any unresolved discrepancy. Create one approved default warehouse; set version to an agreed initial value. Any unexplained mismatch blocks that SKU's cutover.
- B: take a physical stock count at cutover and use the approved count as opening stock, retaining source quantities/ledger in the archive.
- C: block all inventory cutover until a full stocktake/reconciliation is complete.

**Confirm:** A / B / C / OTHER.

### Q7 — Retention method for data that has no target table/column

Examples: order image snapshots, payment refund aggregates/actors, voucher scope/use history, checkout quotes, supplier address/note, receipt date/note, shipping delivery_mode, order recipient_email/notes/reasons/timestamps, and audit descriptions.

- **A — Recommended:** keep a controlled, read-only legacy archive database/schema outside the 31-table target, with stable source IDs, migration crosswalks, access control, backups and a documented retention period. Do not delete source data during expand/backfill.
- B: export field/row-level data into an encrypted, versioned archival artifact with a retrieval manifest and approved access/retention controls.
- C: approve irreversible retirement of specifically listed fields/rows after reviewing a disposition report.
- D: change the target ERD to preserve the data directly in target tables.

**Confirm:** A / B / C / D / OTHER. If A or B, indicate the desired retention period/policy if already known.

### Q8 — Voucher scopes, usage records and checkout_quotes after cutover

The target includes VOUCHERS and ORDER_VOUCHER_SNAPSHOTS only; it does not include voucher-product/category links, a voucher usage ledger or checkout_quotes.

- **A — Recommended if 31 tables are fixed:** drain/expire all old checkout quotes before cutover; archive source usage history and target links; disable/retire vouchers whose scope or usage behavior cannot be represented. Enable only voucher behavior fully expressible by the approved target fields and API rules.
- B: these scoped voucher/quote capabilities must remain fully operational; pause cutover and request an explicit target/API redesign.
- C: temporarily keep the old checkout/voucher path operating until the target-compatible replacement passes acceptance, then cut over; no source tables are dropped while old code depends on them.

**Confirm:** A / B / C / OTHER.

### Q9 — Historical Order totals and line-level discount_amount

The source stores discount_snapshot at Order level; it has no historical per-line discount allocation. Target ORDER_ITEMS adds discount_amount.

- **A — Recommended:** map historical order-level subtotal/discount/shipping/total exactly; keep line_total from the source snapshot and set legacy line discount_amount to zero only if the agreed target contract defines line_total as pre-order-discount. Do not invent a per-line historical allocation. New orders should store real line-level discounts if the future business rules use them.
- B: allocate historical order discount proportionally across lines with deterministic rounding/remainder rules; accept that this is a derived allocation, not historical fact.
- C: do not migrate affected orders until another accounting-preserving representation is approved.

The source also lacks currency and a separate placed_at. The recommendation is to approve VND for this single-market app and map placed_at from the existing order created_at only if that timestamp represents order placement in the current implementation; otherwise preserve it as unknown/archive.

**Confirm:** A / B / C / OTHER. Also confirm currency/placed_at: **VND + created_at mapping** / **provide another rule**.

### Q10 — Legacy payment/refund mapping

The source stores amount_due, amount_received, amount_refunded and collection/refund actor-times. Target PAYMENTS has one amount, payment_status, method/currency and collection attribution only.

- **A — Recommended:** map amount_due to target amount; map payment status and collection actor/time where source-backed; use method COD if confirmed by the existing business contract; preserve amount_received, amount_refunded, refund actor/time and their source provenance in the approved archive. Do not invent payment transaction or refund event rows.
- B: define target amount as amount_received instead of amount_due and specify treatment for unpaid/partial/refunded rows.
- C: block migration of payment/order rows until an alternate lossless representation is approved.

**Confirm:** A / B / C / OTHER. Confirm method/currency: **COD + VND** / **provide another rule**.

### Q11 — ORDER_VOUCHER_SNAPSHOTS for historical orders

The source order has a voucher_id and an aggregate discount, but does not store historical voucher code/type/value snapshots.

- **A — Recommended:** preserve the mapped voucher FK and historical order discount where valid; do not create ORDER_VOUCHER_SNAPSHOTS for legacy orders when the historical values cannot be proved. New orders create the snapshot at placement time.
- B: snapshot the current VOUCHERS fields for historical orders and explicitly accept that they may differ from the values applied when the order was placed.
- C: block orders with a voucher until a trustworthy historical voucher source is found.

**Confirm:** A / B / C / OTHER.

### Q12 — Address, shipping and returned-order facts

The source has free-form address_text/order recipient address, recipient_phone/email, shipping delivery_mode/carrier_name and Order status timestamps. The target has structured address snapshots and SHIPPING_INFOS, but no Returns tables.

- **A — Recommended:** preserve raw legacy address as address_line and phone as source-backed; leave unknown recipient_name/province/district/ward, tracking_number and shipped/delivered timestamps unknown where nullable. Archive recipient_email and delivery_mode. Preserve Order.status including RETURNED; do not fabricate return rows/events. Collect structured fields for new orders.
- B: derive structured address/shipping fields from a separately approved authoritative source.
- C: change the ERD/API contract to retain the source-only fields within the target schema.

**Confirm:** A / B / C / OTHER.

### Q13 — Backfilling target idempotency keys

Target ORDERS and INVENTORY_TRANSACTIONS mark idempotency_key unique, but the source has no equivalent key on these rows.

- **A — Recommended:** assign deterministic reserved-prefix migration identifiers \`LEGACY-ORDER-{old_order_id}\` and \`LEGACY-INVENTORY-TXN-{old_txn_id}\`. Treat these as historical identity placeholders, not as real client request keys. New runtime idempotency must use the approved API command contract.
- B: provide a different approved deterministic key scheme.
- C: make the target key nullable where valid and leave legacy keys NULL; explicitly approve its uniqueness/null behavior.

**Confirm:** A / B / C / OTHER.

### Q14 — Status migration and physical SQL defaults

The logical ERD does not list all status literals or most lengths/nullability/defaults/checks/indexes/FK actions.

- **A — Recommended:** preserve a source status literal where its meaning is unchanged; record an explicit old-to-target translation for every changed state; unknown/unmapped status is a hard error, never silently coerced. Derive physical types from repository conventions and source/API limits: BIGINT IDs, DECIMAL(18,2) for money, TIMESTAMP(6) with the established UTC policy, and no cascading deletes unless an explicit reviewed rule requires otherwise. Propose varchar lengths/defaults/checks/indexes in the physical dictionary for review before DDL.
- B: owner supplies the complete status/value and physical rule matrix before migration design starts.
- C: defer target migration until all physical details are separately signed off.

**Confirm:** A / B / C / OTHER.

## What will happen after the answers

After owner decisions are recorded, the migration plan will be revised to match them. The source-only fields will get a row/field-level disposition matrix; the preflight will be run only on a disposable/sanitized MySQL database; and crosswalk/reconciliation tests will be drafted before any target migration. V1–V6 remain immutable. No production migration, source deletion or target schema expansion is authorized by answering this questionnaire alone.
