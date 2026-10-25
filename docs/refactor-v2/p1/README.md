# FIDO P1 — ERD v2 Contract and Acceptance Workstream

**Contract/schema gate:** P1.9 PASS on its reviewed PR candidate. **P1 overall:** PARTIAL — runtime implementation and end-to-end acceptance remain open.

**Purpose:** this directory contains the ordered P1.1–P1.9 redesign work package. Keep domain-phase contracts and shared P1 evidence here; canonical logical-target artwork and supporting operator documents are indexed in [`../target/`](../target/README.md). The machine-readable physical Data Dictionary CSV remains here because it is the canonical P1 artifact consumed by the consistency checker; do not create another copy.

## Authority

1. [Owner approval record](P1-owner-approval-2026-10-23.md) plus the [2026-10-25 owner amendment](P1-owner-amendment-2026-10-25.md).
2. [Canonical logical ERD](../target/erd-v2-approved.mmd).
3. [Canonical physical Data Dictionary CSV](P1-data-dictionary.csv) and isolated target DDL under `backend/src/main/resources/db/clean-reset/`.
4. [Decision log](P1-decision-log.md) and current contracts `docs/04–07` plus P1.2–P1.8 below.
5. [P1.9 consistency report](P1.9-contract-consistency-report.md) and [exit gate](P1-exit-gate.md) for delivery status; neither overrides an approved business contract.

## Phase sequence

| Phase | Main contract / entry point | Deliverables and responsibility |
|---|---|---|
| **P1.1 — Baseline inventory** | [Baseline inventory](P1.1-baseline-inventory.md) | [Document owner map](P1.1-document-owner-map.csv) and [ERD discrepancy matrix](P1.1-erd-discrepancy-matrix.csv). Records the baseline and routes findings; does not independently change domain rules. |
| **P1.2 — Account, Address and RBAC** | [Account/address/RBAC contract](P1.2-account-address-rbac-contract.md) | [Role-permission matrix](P1.2-role-permission-matrix.csv). Defines account lifecycle, address ownership, identity and authorization boundaries. |
| **P1.3 — Catalog metadata** | [Catalog metadata contract](P1.3-catalog-metadata-contract.md) | Product hierarchy/identity, typed attributes, product metadata APIs and image-primary/order-snapshot boundary. |
| **P1.4 — Inventory** | [Inventory contract](P1.4-inventory-contract.md) | Warehouse and receipt lifecycle, balance/ledger, movement source, reversals, deduplication and concurrency. |
| **P1.5 — Pricing and Voucher** | [Pricing/Voucher contract](P1.5-pricing-voucher-contract.md) | Whole-VND arithmetic, HALF-UP rounding, largest-remainder allocation, eligibility and quota behavior. |
| **P1.6 — Cart and Checkout** | [Cart/Checkout contract](P1.6-cart-checkout-contract.md) | Authenticated Cart, stateless quote, server-side revalidation and account-scoped idempotency/replay. |
| **P1.7 — Order and Payment** | [Order/Payment contract](P1.7-order-payment-contract.md) | State/actor matrix, order-time snapshots, COD, manual shipping, cancellation and compensation boundaries. |
| **P1.8 — Operations and seed** | [Operations/seed contract](P1.8-operations-seed-contract.md) | Audit/redaction/correlation, content/report scope, deletion/FK rules, target permission manifest and retention blockers; see the [operator runbook](P1.8-operations-seed-runbook.md). |
| **P1.9 — Cross-domain gate** | [Consistency report](P1.9-contract-consistency-report.md) and [exit gate](P1-exit-gate.md) | Reconciles ERD, Dictionary, isolated DDL, seed, API/DTO mappings and legacy references. PASS here clears only the P1.9 contract/schema entry gate, not runtime acceptance. |

## Shared P1 artifacts

### Canonical target and approved decisions

- [`P1-data-dictionary.csv`](P1-data-dictionary.csv) — canonical machine-readable physical field contract and runtime discrepancy evidence.
- [`P1-data-dictionary.md`](P1-data-dictionary.md) — interpretation, validation and safe-change rules for the CSV.
- [`P1-erd-v2.md`](P1-erd-v2.md) — pointer/status summary; the full diagram lives only in [`../target/erd-v2-approved.mmd`](../target/erd-v2-approved.mmd).
- [`P1-decision-log.md`](P1-decision-log.md), [owner approval](P1-owner-approval-2026-10-23.md), and [owner amendment](P1-owner-amendment-2026-10-25.md) — approved decisions and dated changes.
- [`P1-contract-reconciliation-2026-10-23.md`](P1-contract-reconciliation-2026-10-23.md) — the earlier reconciliation snapshot; later amendments and the P1.9 report take precedence for subsequent changes.

### Cross-layer mapping and architecture

- [`P1-api-contract-mapping.csv`](P1-api-contract-mapping.csv) — historical route inventory mapped to target/retired disposition; not a second active API contract.
- [`P1-api-breaking-changes.md`](P1-api-breaking-changes.md) — target-vs-runtime breaking-change inventory for implementation.
- [`P1-use-case-target-mapping.md`](P1-use-case-target-mapping.md) — target use-case and acceptance mapping.
- [`P1-domain-invariants.md`](P1-domain-invariants.md) — approved domain, transaction and lifecycle invariants.
- [`P1-design-proposals-DB-03-DB-05.md`](P1-design-proposals-DB-03-DB-05.md) — approved inventory/ledger and checkout/idempotency mechanics; runtime tests still required.
- [`P1-architecture-review.md`](P1-architecture-review.md) — current target-vs-code architecture findings.

### Verification and traceability

- [`P1-schema-constraints.md`](P1-schema-constraints.md) — target DB constraints and exact-SHA validation gates.
- [`P1-test-matrix.md`](P1-test-matrix.md) — schema, API, security, transaction, concurrency and end-to-end cases.
- [`P1-traceability-matrix.csv`](P1-traceability-matrix.csv) — separate evidence for ERD, DDL, Dictionary, backend, API/DTO, frontend and tests.

## Frozen target invariants

- Exactly 31 target logical tables; no unapproved legacy or new tables.
- Product-ID identity throughout Cart, Order, receipt and inventory.
- Parent/child Products are explicit and independently sellable; each row owns SKU, integer-VND price and inventory; no implicit NULL inheritance.
- OPTION/TEXT/NUMBER/BOOLEAN attributes are descriptive only; an option must belong to the same Attribute; metadata never auto-generates Products.
- Cart and order placement require authentication; quote is stateless/advisory; server revalidates on placement and uses account-scoped idempotency.
- Money uses whole VND, approved discount allocation, append-only inventory ledger, source-derived deduplication and atomic source/balance/ledger/audit effects.
- v1 uses a global non-stacking order Voucher quota, COD, one operational warehouse, manual shipping and the approved Order/Payment/ShippingInfo state rules.
- Order-time image snapshots resolve to stable immutable object/version content. Numeric retention/anonymization requirements remain TBD.
- Clean Schema Reset is only for a database verified as disposable local/development/test data. No reset is implied.

## Acceptance boundary

Owner-approved design choices are recorded except numeric retention periods and legally required anonymization/deletion exceptions. P1.9 PASS means cross-domain contract/schema consistency passed its exact-SHA gate; it does **not** mean the runtime is migrated. Entity/Repository/Service, API/DTO, authorization, frontend, transaction/concurrency, seed activation and end-to-end acceptance remain implementation work. Check each candidate SHA and its own CI before starting dependent work.

For directory ownership across the complete redesign, use the [ERD v2 program index](../README.md). Historical reports are in [`docs/archive/`](../../archive/README.md) and must not be treated as current requirements.
