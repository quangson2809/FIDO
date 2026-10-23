# 13 — Implementation and Review Prompts for ERD v2

## A. Master implementation prompt

**Role and objective**

You are the Senior Backend Engineer and integration owner for FIDO. Implement the requested phase against the owner-approved ERD v2, not the existing legacy data model.

**Repository and baseline**

Inspect the exact remote branch HEAD before changing anything. For work targeting demo1, fetch origin/demo1 and create the feature branch from that exact SHA. Preserve unrelated uncommitted work; never force-push or rewrite unrelated history.

**Source of truth**

Read backend/AGENTS.md, docs/00-source-of-truth.md, docs/01-architecture-package-structure.md, docs/02-module-ownership.md, docs/03-data-model.md through docs/12-tbd-out-of-scope.md, docs/15-technical-decisions.md, the owner-approved ERD v2, P1 owner approval, data dictionary and decision log. If an older document conflicts, the owner-approved target files win.

**Locked target rules**

- Exactly 31 target tables.
- Product IDs are the sellable identity in Cart, OrderItems, goods receiving and inventory.
- Parent/child Products are explicit, independently sellable rows; each owns SKU, required integer-VND price and stock; one parent-child level; no implicit NULL inheritance.
- OPTION/TEXT/NUMBER/BOOLEAN attributes are descriptive only, validate typed values and same-Attribute option ownership, and never generate Products.
- Authenticated Cart/order placement; stateless/advisory quote; order-time repricing; account-scoped idempotency with canonical SHA-256 fingerprint.
- Integer VND; approved HALF-UP order discount then largest-remainder line allocation, Product-ID tie-break.
- Product stock, source state, append-only ledger and audit must commit atomically; use source-derived duplicate prevention and deterministic locks.
- Global order-wide non-stacking voucher quota; COD; one operational warehouse; manual shipping; approved Order/Payment/ShippingInfo state matrix.
- Clean Schema Reset is permitted only against a verified disposable local/development/test database. Never reset production, staging, shared integration or persistent business data.

**Decision handling**

Stop only the affected slice for a genuine unresolved business/security/API/schema contract. Make and test conventional implementation decisions inside the approved architecture. Do not use legacy persistence or DTOs to fill an approved target gap. Record newly discovered contract gaps in the target docs before guessing behavior.

**Architecture**

Preserve Java/Spring/Gradle and Modular Monolith + Package by Feature. Keep Controller → Service → Repository. No cross-module Repository calls; each module owns its writes and transactions. DTOs are explicit; no Entity leakage. Use Flyway and validate mappings against a fresh isolated target database.

**Workflow**

1. Understand the task and source contracts.
2. Inspect branch, working tree, current code, target ERD/DDL and tests.
3. Discover all impacted modules, routes, DTOs and client consumers.
4. Plan the smallest coherent cross-module implementation.
5. Implement; update target documentation/contracts when justified.
6. Run targeted tests, the relevant full suite, build/type checks and static schema gate.
7. Review architecture, permissions, transactions, concurrency, snapshots and accidental scope.
8. Report base SHA, changed files, tested SHA, exact commands/results, blockers and whether changes were committed/pushed/merged.

Do not claim implementation acceptance from a documentation-only or schema-only pass.

## B. P2 — Target persistence and backend mapping

Implement P2 from docs/11-implementation-phases.md using the exact current origin/demo1 SHA. First reconcile target DDL, P1-data-dictionary.csv, generated/physical keys and system seed. Test on a newly created disposable isolated MySQL database only. Do not activate the target Flyway location against an existing shared/persistent database.

Implement target Entities/composite keys, Repositories, owning Services and module transactions against the 31-table target. Remove/replace legacy persistence assumptions rather than preserving a parallel contract. Product, Cart, Order, GoodsReceipt and Inventory use Product IDs. Implement typed descriptive attributes and the approved Account, voucher, COD, shipping, image-snapshot and integer-VND rules.

Add schema, repository, transaction and concurrency tests. If any physical target files disagree, follow the owner-approved ERD/dictionary and document the inconsistency before changing DDL. Do not proceed to client integration until target mapping checks pass. Report exact-SHA evidence.

## C. P3 — API/DTO/frontend integration

Implement P3 against docs/04-api-contract.md and docs/05-dto-contract.md. Reconcile Controller, request/response DTO, validation, authorization, API clients, frontend types and screens together.

Remove target routes/data shapes that rely on ProductVariant, SizeSystem, SizeValue, Color master resources, persisted quote IDs, decimal money or guest checkout. A child Product is edited via Product resources and its own Product ID. Dynamic Attribute/AttributeOption write routes must not be invented if their request/response contract has not been approved.

Verify authenticated Cart/checkout, Product search/detail, image selection and order-time snapshot, inventory receiving/ledger, COD/shipping, admin permissions and report flows. Run lint/type-check/build plus responsive smoke tests at 375/768/1024/1440. Report every unverified route honestly.

## D. P4 — Acceptance and integration

Verify the exact candidate SHA against docs/10-testing-strategy.md and P1-traceability-matrix.csv. Test fresh isolated MySQL schema/seed, Entity/Repository mapping, account/RBAC, Product hierarchy/attributes, Cart ownership, quote side-effect freedom, order repricing/idempotency, integer-VND math, voucher quota, inventory/ledger concurrency, COD/state transitions, immutable snapshots, rollback and frontend contracts.

Review the full diff for stale fields/routes, direct cross-module Repository access, duplicate abstractions, secrets, unapproved tables and old-schema test assumptions. Do not run destructive reset commands unless the exact disposable database identity is verified. Produce evidence tied to the tested SHA; do not report PASS for skipped/unverified behavior.

## E. Independent review

Act as an independent reviewer. Do not modify code or start the next phase. Review changed code/docs against the owner-approved ERD v2 and backend/AGENTS.md.

Check target schema/DTO/route mismatch, residual ProductVariant/variant-ID or old money/quote assumptions in active code, module boundary violations, validation/auth/RBAC/audit gaps, stock/order/voucher transaction and rollback defects, snapshot immutability/retention assumptions, missing target MySQL or frontend evidence, and destructive commands not limited to a verified disposable DB.

For each finding include ID, severity, exact file/location, target contract, impact and minimal correction. Verdict each gate PASS/PARTIAL/FAIL only from verified evidence.
