# 11 — Backend Implementation Phases for Codex

The sequence minimizes rework and follows dependencies. Codex must finish/verify one phase before opening the next.

## Phase 0 — Repository discovery & architecture guard

**Goal:** understand the existing BE before writing business code.

Tasks:
- inspect build file, Java/Spring version, package tree, config, DB/migration, security, tests;
- compare current tree to the agreed modular structure;
- create/move only structural scaffolding required by the agreed tree;
- no speculative entities/business rules;
- document any architecture-affecting missing decision.

Exit: project builds/tests; no fake domain implementation.

## Phase 1 — Common/API foundation + persistence baseline

**Goal:** establish reusable technical foundation and 28-table mapping/migrations using the repo's already selected DB/migration technology.

Tasks:
- common response/pagination model matching Analyst API;
- centralized exception infrastructure without inventing a public error contract;
- base auditing/timestamp convention as already supported by stack;
- entity/repository skeletons for approved tables;
- DB constraints/unique/FK/checks that are portable in current DB;
- no Notification/after_sales/table timeline/unit_cost fields.

Exit: schema/entity mapping tested; table count/ownership reconciles with 28-table baseline.

## Phase 2 — account + authentication/RBAC

Implement green APIs #1–7 and #58–69, plus account-side foundations for #3/#4 and customer/admin reads later.

Do not invent:
- login identifier policy;
- account enabled/disabled lifecycle;
- detailed employee permission-code matrix;
- refresh token endpoint.

If login identifier is not already locked in repo/config, stop at that material decision for production login behavior.

## Phase 3 — product/catalog

Implement #11–13 and #27–45.

Must enforce:
- tree/no cycle;
- Product leaf Category;
- SizeSystem/SizeValue consistency;
- unique Variant combination;
- effective price/availability derivation;
- history-safe updates/deletes.

## Phase 4 — inventory/receiving

Implement #46–57.

Must prove:
- receipt confirm once;
- inventory never negative;
- every movement has ledger/source/actor/time;
- manual adjustment requires reason;
- no unit_cost field.

## Phase 5 — cart + checkout calculation

Implement #14–19 to the extent guest identity mechanism is available.

- Cart never reserves stock.
- Quote never creates Order/deducts stock.
- Voucher-specific calculation remains blocked until voucher rules are refined.
- Do not invent guest session key/TTL/merge behavior.

## Phase 6 — Order creation & operations

Implement #20–26 and customer Order views #8–10.

Prerequisite: an approved create-Order dedupe mechanism for production-safe API #20.

Implement:
- snapshots;
- state machine;
- atomic confirmation;
- cancel restock;
- COD conditional transitions;
- shipping manual info;
- delivery failure semantics;
- after-sales command without new resource/table.

## Phase 7 — audit, reporting, content, customer back-office

Implement:
- #70 audit query;
- #71 report overview;
- #72–75 content pages;
- #76–77 customer back-office.

No report aggregate table unless performance evidence and a new decision require it. No content publish lifecycle.

## Phase 8 — hardening

- concurrency tests;
- idempotency/retry tests;
- authorization matrix tests using only approved role/permission setup;
- index/query review;
- secure logging/PII review;
- integration/API regression of all green implemented contracts;
- unresolved yellow/TBD list remains explicit.

## Phase gate output template

For every phase Codex reports:

```text
PHASE:
SOURCE IDS IMPLEMENTED:
FILES CHANGED:
SCHEMA/API CHANGES:
TESTS RUN + RESULT:
INVARIANTS VERIFIED:
TBD/BLOCKERS REMAINING:
NEXT PHASE READY: YES/NO
```
