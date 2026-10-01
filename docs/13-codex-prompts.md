# 13 — Codex Task Prompts

## A. Master implementation prompt

```text
ROLE
You are the backend implementer for FIDO.

OBJECTIVE
Implement only the requested backend phase using the repository's current Java/Spring/Gradle/MySQL stack.

MANDATORY INPUT
Read:
- backend/AGENTS.md
- docs/00-source-of-truth.md
- docs/01-architecture-package-structure.md
- docs/02-module-ownership.md
- relevant docs/03..10
- docs/11-implementation-phases.md
- docs/12-tbd-out-of-scope.md
- docs/15-technical-decisions.md

Inspect current branch HEAD before changing code.

DECISION CLASSIFICATION
For every unresolved point classify it as:

HARD BLOCK:
Only when proceeding would invent/change business behavior, public API semantics, security guarantee, persistent business meaning/schema, state machine, money/stock semantics or external integration contract.
Stop only the affected slice.

TECHNICAL DECISION:
Class/method/repository naming, query strategy, mapper/private helper design, technical enum literal names with fixed semantics, capability code naming, package decomposition inside an approved module.
Choose the smallest conventional implementation, record it in docs/15-technical-decisions.md, add tests, and CONTINUE.

DEFERRED FEATURE:
Explicit source TBD/phase-later functionality.
Skip only that slice and CONTINUE all independent work.

Never mark a whole phase BLOCKED solely because of a technical naming/design choice.

ARCHITECTURE
Preserve com.fido Modular Monolith + Package by Feature:
account, product, cart, promotion, order, inventory, audit, report, content.
No cross-module Repository calls.
Controller has no business logic.
Service owns orchestration/transactions.
Entity never leaves Controller as REST output.

PROCESS
1. Inspect branch/code.
2. Map phase to source IDs/APIs/tables.
3. Classify unresolved points.
4. Implement all non-blocked work.
5. Record technical decisions.
6. Run relevant tests/build.
7. Review diff.
8. Report PASS/PARTIAL only from evidence.
Do not open the next phase before the gate passes.
```

## B. Phase 3 — Catalog continuation prompt

```text
Implement Phase 3 only from docs/11-implementation-phases.md.

Do NOT stop for ordinary technical choices.

Implement public/admin Catalog APIs #11–13 and #27–45.

Locked business/data rules:
- Category is a tree; prevent cycles.
- Product only belongs to a leaf Category.
- Product selects one SizeSystem.
- Variant SizeValue must belong to Product SizeSystem.
- Product + SizeValue + Color is unique.
- effective_price = override_price when non-null, otherwise base_price.
- sellable availability derives from Product sale state + Variant sale state + inventory.available_quantity.
- zero inventory is not the same as stopped sale.
- do not rewrite historical Variant identity after order history.

Approved technical encodings:
- sale-state literals: ON_SALE and STOPPED.
- catalog capabilities: CATALOG_READ and CATALOG_WRITE.
- SUPERADMIN may perform both.
- do not automatically grant either capability to ADMIN or any employee role; role assignment remains business/configuration data.

Source TBD that must NOT block the rest:
- default public sort;
- special direct-URL behavior for a stopped Product;
- detailed size-guide model;
- exact gender/season/style enum sets.

For TBD slices, implement no speculative lifecycle/redirect/model. Continue all independent Catalog work.

Add service/repository/API/authorization tests.
Run backend tests.
Stop after Phase 3 and report evidence.
```

## C. Phase 4 — Inventory & Receiving

```text
Implement Phase 4 only.
Supplier/GoodsReceipt/Inventory/InventoryTransaction APIs #46–57.
GoodsReceipt confirm must increase availability exactly once.
Every stock mutation must create immutable ledger movement in the same transaction.
Manual adjustment requires permission, actor, reason and audit.
No unit_cost and no direct overwrite endpoint.
Do not block on technical method/query naming.
Run transaction/idempotency tests and stop after Phase 4.
```

## D. Phase 5 — Cart / Quote

```text
Implement Phase 5 only.
Implement all non-deferred Cart/Quote behavior for #14–19.
Cart never reserves/deducts inventory.
Quote recalculates server-side and has no side effect.
Guest-session mechanics and voucher rules are deferred slices, not reasons to block authenticated Cart or voucher-less Quote.
Run tests and stop after Phase 5.
```

## E. Phase 6 — Order / COD

```text
Implement Phase 6 only: APIs #8–10 and #20–26.
Implement snapshots, exact Order/Payment state machines, atomic confirm, cancel restore, COD collect/refund, delivery-failure and baseline after-sales behavior.
Use Inventory service contract, never InventoryRepository directly.
Create-order dedupe is a blocker only for the retry/double-submit guarantee; continue independent Order behavior.
Add concurrency/idempotency/rollback tests.
Stop after Phase 6.
```

## F. Phase 7 — Operations

```text
Implement Phase 7 only: audit #70, report #71, content #72–75, customers #76–77.
No aggregate report table without evidence.
No content publish/version lifecycle.
Guest Orders do not become Accounts.
Run permission/query/API tests and stop after Phase 7.
```

## G. Independent review of a branch or phase

Use Codex `/review` against the actual base branch for changed-code review. A whole-backend architecture audit is a separate task: inspect every claimed area and report coverage. Do not infer whole-system quality from a diff. Record the exact head SHA. The reviewer does not modify code.

```text
ROLE: Independent FIDO backend reviewer, read-only.
SCOPE: Review the selected branch diff against its actual base, or the specified phase/commit.
Read backend/AGENTS.md and the relevant docs/00..15, then inspect surrounding code and tests.

Evaluate applicable contracts and design consequences: KISS, YAGNI, Boy Scout Rule,
Separation of Concerns, Low Coupling, High Cohesion, Law of Demeter, Curly's Law,
Principle of Least Astonishment and Least Privilege. Check module ownership,
authorization, API behavior, persistence, transaction boundaries, stock/payment
idempotency, tests and CI evidence. Assess the concrete change; do not require
Query/Command splitting, one interface per class, or any fixed package pattern.

For each actionable finding give severity BLOCKER/MAJOR/MINOR/INFO, file:line,
source rule or principle, a concrete scenario, impact and minimal remediation.
Separate defects introduced by the diff from pre-existing risks. State reviewed
HEAD/base, coverage, verification performed/not performed, findings and residual
uncertainty. Do not label unverified work PASS.
```

### PR quality-gate handoff

The repository's `.github/workflows/backend-verification.yml` runs H2/MySQL tests and independently checks for a PR review on the **current PR head** using `.quality/validate_work_review.py`. A local `/review` report alone does not satisfy that GitHub review requirement. After an independent Work review, post a PR review with state **COMMENTED** and the exact marker/payload below; replace the placeholder SHA and findings with reviewed evidence. Never manufacture a PASS payload to unblock CI.

```text
<!-- FIDO_WORK_REVIEW_V1 -->
```
```json
{
  "version": "1",
  "head_sha": "<current 40-character lowercase PR head SHA>",
  "result": "PASS",
  "summary": "<reviewed scope and evidence>",
  "blocking_findings": [],
  "findings": []
}
```

For every finding include `id` (for example `ARC-001`), `severity`, nonempty `principles` and `evidence` arrays, `impact`, `recommendation`, and optionally `files`. `blocking_findings` must contain exactly the IDs of all BLOCKER/MAJOR findings; set `result` to FAIL when that list is nonempty. The validator checks payload shape, current SHA and consistency; it cannot prove that the human or AI review was thorough. CI tests and structural review are separate inputs to the final gate.
