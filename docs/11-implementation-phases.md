# 11 — Backend Deep Implementation Phases

The backend is delivered in nine cohesive phases. Do not fragment the system into one phase per endpoint. Each phase should complete the largest coherent domain slice that can be implemented safely from the approved sources.

## Blocker policy used by every phase

Before stopping, classify the unresolved point:

- **HARD BLOCK** — proceeding changes/invents business behavior, public API semantics, security guarantee, persistent business meaning/schema, state machine, money/stock semantics or an external contract.
- **TECHNICAL DECISION** — implementation naming/organization/algorithm choice with already-fixed semantics. Decide minimally, record in `docs/15-technical-decisions.md`, test, continue.
- **DEFERRED FEATURE** — explicitly phase-later/TBD feature. Skip only the affected slice and continue the phase.

A blocker in one slice does not block unrelated work in the same phase.

## Phase 0 — Canonicalization & engineering guard

**Goal:** create one implementable interpretation of the Analyst sources and current repository without inventing business behavior.

Tasks:
- inspect Java/Spring/Gradle/DB/migration/security/test setup;
- apply `docs/00-source-of-truth.md` when sources differ;
- reconcile Class/Sequence diagrams against DD-DB-01 v1.3.0 and current API;
- keep architecture Modular Monolith + Package by Feature;
- record repository-approved technical decisions in `docs/15-technical-decisions.md`;
- classify all known gaps into HARD BLOCK / TECHNICAL DECISION / DEFERRED FEATURE.

Exit:
- build/tests pass;
- architecture/source authority is documented;
- no fake business implementation;
- ordinary technical choices are not left as stakeholder blockers.

## Phase 1 — Persistence foundation

**Goal:** implement the exact relational baseline and common API foundation.

Scope:
- common response/pagination/exception infrastructure;
- Flyway baseline for the approved 28 tables;
- JPA entities/repositories;
- FK/unique/check/index rules supported by current MySQL;
- immutable history conventions.

Do not add Notification, order timeline, after-sales case, unit_cost, voucher-rule fields, account_status, tracking or system settings.

Exit:
- schema/entity mapping reconciles with the 28-table baseline;
- migration/mapping/constraint tests pass.

## Phase 2 — Identity, authentication, RBAC & audit foundation

**Goal:** complete account/auth/RBAC green APIs and a reusable authorization foundation.

Implement APIs #1–7 and #58–69.

Rules:
- use approved phone-login decision from `docs/15`;
- SUPERADMIN remains highest technical administrator;
- do not create account status/disable lifecycle or refresh token;
- role-to-business-permission matrix remains unassigned unless explicitly approved;
- capability identifiers needed by implemented endpoints are technical decisions, not blockers;
- every admin endpoint checks authorization server-side;
- important writes include audit in the same service transaction where required.

Exit:
- auth/profile/address/staff/role/permission flows work;
- ownership/authorization/RBAC tests pass.

## Phase 3 — Complete Catalog domain

**Goal:** deliver public and admin Catalog as one cohesive vertical slice.

Implement APIs #11–13 and #27–45.

Must enforce:
- Category tree and no cycle;
- Product belongs only to a leaf Category;
- Product selects one SizeSystem;
- Variant SizeValue belongs to that Product SizeSystem;
- Product + SizeValue + Color unique;
- effective price = variant override price else Product base price;
- sellable availability derives from Product sale state + Variant sale state + inventory availability;
- zero stock is not the same as stopped sale;
- historical Variant identity is not rewritten after order history exists.

Technical decisions already approved for implementation:
- sale-state literals: `ON_SALE`, `STOPPED`; these encode the already-documented meanings “đang bán” and “ngừng bán” and do not add a new lifecycle;
- capability identifiers: `CATALOG_READ` and `CATALOG_WRITE`;
- SUPERADMIN may perform both capabilities;
- no employee role is automatically granted either capability; role-to-permission assignment remains data/business configuration.

Important nuance:
- default sorting and direct public URL behavior for a stopped Product remain source TBD; do not let those details block the rest of Catalog. Use no speculative special redirect/tombstone lifecycle.

Exit:
- public/admin catalog API tests pass;
- constraints/business rules above are tested;
- no detailed size-guide model or invented gender/season/style enum set.

## Phase 4 — Inventory & Receiving

**Goal:** complete Supplier, GoodsReceipt, Inventory and ledger behavior.

Implement APIs #46–57.

Must prove:
- GoodsReceipt DRAFT can be edited; CONFIRMED stock-affecting items are immutable;
- confirmation increases sellable availability exactly once;
- every stock mutation writes an immutable InventoryTransaction in the same transaction;
- manual adjustment requires permission, reason, actor and audit;
- stock never becomes negative;
- no `unit_cost` field.

Exit:
- transaction/idempotency/rollback tests pass.

## Phase 5 — Cart, Checkout Quote & Promotion integration

**Goal:** complete all non-speculative Cart/Checkout behavior without waiting for unrelated TBDs.

Implement APIs #14–19 where source is ready.

Must enforce:
- Cart never reserves/deducts stock;
- quote has no persistence side effect and never creates Order;
- server recalculates effective prices/availability;
- authenticated cart path is implementable independently.

Deferred slices:
- guest-session key/TTL/persistence/merge;
- voucher eligibility/calculation beyond locked `voucher_id/code`.

These deferred slices do not block authenticated Cart or voucher-less Quote.

Exit:
- all non-deferred Cart/Quote behavior and tests pass.

## Phase 6 — Order, COD, Fulfillment & baseline After-sales

**Goal:** deliver the complete order state machine and stock/payment consistency.

Implement APIs #8–10 and #20–26.

Implement:
- PENDING creation with immutable snapshots and UNPAID Payment;
- no stock deduction on create;
- atomic PENDING -> CONFIRMED stock check/deduction;
- PREPARING/SHIPPING/COMPLETED/DELIVERY_FAILED/CANCELLED/RETURNED transitions;
- cancel stock restoration exactly once when prior deduction occurred;
- COD UNPAID -> PAID -> REFUNDED;
- COMPLETE only when SHIPPING and PAID;
- DELIVERY_FAILED does not auto-restock;
- RETURNED does not auto-restock without actual returned sellable stock;
- recipient editable only through PREPARING;
- after-sales remains command-based, no new case resource/table.

Create-order dedupe is a HARD BLOCK only for the retry/double-submit guarantee itself; it must not prevent implementation/testing of the rest of Order behavior.

Exit:
- state, rollback, idempotency and concurrency tests pass for implemented guarantees.

## Phase 7 — Operations: Audit, Reporting, Content & Customer back-office

Implement:
- #70 audit;
- #71 report;
- #72–75 content;
- #76–77 customer back-office.

Rules:
- report remains query-based;
- no report aggregate table without measured need and new decision;
- no content draft/publish/version lifecycle;
- guest Orders do not become Accounts;
- do not expose unnecessary PII.

Exit:
- authorization/query/API/report adjustment tests pass.

## Phase 8 — Hardening & delivery readiness

No new feature work.

Verify:
- all implemented baseline APIs against current API contract;
- architecture boundaries and no cross-module Repository access;
- no Entity leakage from controllers;
- JWT/RBAC/ownership;
- secure logging and PII handling;
- stock/payment/receipt concurrency and retry safety;
- transaction rollback;
- indexes/query behavior;
- full regression.

Final status must classify every endpoint/requirement as:
- IMPLEMENTED;
- DEFERRED/BLOCKED WITH SOURCE;
- OUT OF SCOPE.

Do not report COMPLETE while a Must baseline slice has an unresolved hard blocker.

## Phase gate output

```text
PHASE:
STATUS: PASS | PARTIAL | BLOCKED | FAIL
SOURCE IDS IMPLEMENTED:
APIS IMPLEMENTED:
FILES CHANGED:
SCHEMA CHANGES:
TECHNICAL DECISIONS RECORDED:
TESTS RUN + RESULT:
INVARIANTS VERIFIED:
DEFERRED SLICES:
HARD BLOCKERS REMAINING:
NEXT PHASE READY: YES | NO
```
