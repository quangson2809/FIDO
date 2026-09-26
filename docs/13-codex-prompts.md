# 13 — Codex Task Prompts

## A. Master prompt — use before any coding phase

```text
ROLE
You are the backend implementer for FIDO.

OBJECTIVE
Implement only the requested backend phase using the repository's existing Java/Spring/build/database stack.

MANDATORY INPUT
Read AGENTS.md and docs/00-source-of-truth.md through docs/12-tbd-out-of-scope.md before changing code. Inspect the current repository first.

ARCHITECTURE
Preserve com.fido modular monolith/package-by-feature:
account, product, cart, promotion, order, inventory, audit, report, content.
Inside each module use controller/service/repository/entity/dto/mapper only as needed.
Do not create root business layers.

RULES
- Never invent API fields, DB fields, states, permission codes, workflows or business rules.
- Never implement a TBD/Phase-later item as if approved.
- Cross-module access through Service/query contract, never another module's Repository.
- Controller has no business logic.
- Transaction boundaries live in Service.
- Entity is never returned directly by Controller.
- Preserve current dependency versions/config; do not upgrade unless task says so.
- Add tests for every rule and transaction changed.

PROCESS
1) inspect; 2) map task to source IDs/tables/API; 3) identify blockers; 4) make smallest coherent change; 5) run tests; 6) review diff.

OUTPUT
Report changed files, source IDs implemented, tests/results, invariants verified, and remaining TBD/blockers.
Do not start a later phase.
```

## B. Phase 1 prompt — data foundation

```text
Implement Phase 1 only from docs/11-implementation-phases.md.
Reconcile the persistence model with the exact 28-table ownership in docs/03-data-model.md.
Use the migration/ORM technology already in the repo.
Add DB/JPA constraints where supported, but do not add speculative fields/tables.
Specifically exclude notifications, order timeline, after_sales_case, unit_cost, voucher rule fields, account_status, shipping tracking reference and generic system_settings.
Verify schema/entity mapping and tests. Stop after Phase 1.
```

## C. Phase 2 prompt — account/RBAC

```text
Implement Phase 2 only: account/auth/RBAC green APIs.
Use API #1-7 and #58-69 from docs/04-api-contract.md and DTO/JWT rules in docs/05-dto-contract.md.
Permission CRUD #66-69 is part of the current 77-API baseline.
Do not implement account disable or refresh token.
Do not invent login identifier policy or employee permission-code matrix. If production auth cannot be completed because the repo has no locked identifier strategy, expose the blocker instead of guessing.
Add ownership and authorization tests. Stop after Phase 2.
```

## D. Phase 3 prompt — product/catalog

```text
Implement Phase 3 only: public/admin catalog APIs #11-13 and #27-45.
Enforce Category tree/no-cycle, leaf-only Product, Product SizeSystem, Variant SizeValue compatibility, unique Product+Size+Color, effective price fallback, sale-state vs zero-stock distinction and immutable historical Variant meaning.
Do not add a detailed size-guide model or invent gender/season/style enum values.
Add unit/integration/API tests. Stop after Phase 3.
```

## E. Phase 4 prompt — inventory

```text
Implement Phase 4 only: Supplier, GoodsReceipt, Inventory and InventoryTransaction APIs #46-57.
Receipt confirmation must be transactionally idempotent and increase sellable availability exactly once.
All stock changes must write immutable ledger entries. Manual adjustments require reason and cannot make stock negative.
No unit_cost. No direct inventory overwrite endpoint.
Run transaction tests. Stop after Phase 4.
```

## F. Phase 5 prompt — cart/quote

```text
Implement Phase 5 only: cart APIs #14-18 and checkout quote #19 within currently resolved identity/security constraints.
Cart does not reserve inventory. Quote performs server-side revalidation/calculation only and has no side effect.
Voucher calculation remains blocked unless voucher refinement exists in repo/docs.
Guest session key/TTL/merge behavior is TBD; do not invent it.
Stop and report any portion blocked by guest identity.
```

## G. Phase 6 prompt — Order/COD

```text
Implement Phase 6 only: Order views/create/commands #8-10 and #20-26.
Before coding API #20, confirm the repo contains an approved create-order dedupe/idempotency mechanism; if absent, flag it as a blocker rather than adding a new schema field.
Implement the exact Order/Payment state machines, snapshots, atomic confirm, cancel restock, COD collect/refund, delivery failure and after-sales command semantics.
Use inventory service contract for stock effects; never InventoryRepository directly.
Add concurrency/idempotency/rollback tests. Stop after Phase 6.
```

## H. Phase 7 prompt — supporting modules

```text
Implement Phase 7 only: audit #70, report #71, content #72-75, customers #76-77.
Report is query-based; do not create aggregate tables without performance evidence.
Content has no draft/publish/version lifecycle.
Customer admin represents registered Account customers; guest Orders do not become Account rows.
Add permission/query/API tests. Stop after Phase 7.
```

## I. Review prompt

```text
Review this phase as an independent backend reviewer.
Check against AGENTS.md and docs/00..14, not against generic e-commerce assumptions.
Find: source deviations, invented fields/rules/endpoints, module-boundary violations, direct cross-module repository calls, missing transaction boundaries, state-machine defects, stock/idempotency bugs, Entity leakage, missing security/audit, missing tests.
For every finding provide severity, source rule, exact file/location, why it is wrong, and minimal remediation.
Do not modify code and do not open the next phase.
```
