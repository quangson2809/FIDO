# 11 — FIDO ERD v2 Implementation Phases

> Navigation: the detailed artifact layout and P0 → P1.1–P1.9 reconstruction sequence are maintained in [`docs/refactor-v2/README.md`](refactor-v2/README.md). This roadmap governs runtime implementation phases; historical implementation reports are indexed under `docs/archive/`.

> **Current authority — 2026-10-25:** the owner-approved 31-table ERD v2, original target business defaults and P1.9 owner amendment are recorded. This roadmap describes delivery against that target only. Historical audit reports are evidence, not target requirements.

## 1. Current status

- Target schema and the two P1.9 owner decisions: **recorded and applied to isolated target artifacts**. The **P1.9 cross-domain contract/schema exit gate is PASS**, based on green checker, isolated MySQL schema tests and backend verification on the current PR head.
- P1.9 documentation reconciliation report: [P1.9-contract-consistency-report.md](refactor-v2/p1/P1.9-contract-consistency-report.md).
- Clean-reset DDL/system seed: isolated; exact-SHA checker, contract-consistency gate, clean-target MySQL schema tests and backend H2/MySQL verification are green on the current PR head.
- Entity, Repository, Service, API/DTO, frontend and workflow alignment: **implementation acceptance open**.
- Numeric retention durations and anonymization exceptions: **TBD**; no automatic purge.
- No database reset was performed by documenting or approving the target.

## 2. P2 — Implement the target model

**Entry gate:** P1.9's cross-domain contract/schema gate is **PASS** on the current PR head, so the P1.9 restriction on P2.1 entry is cleared. Start P2.1 on a focused branch from the verified remote `demo1` head and use only a separately verified disposable MySQL database for clean-reset verification. This does not claim runtime acceptance and does not resolve DB-12 retention/anonymization or historical UC-ID evidence.

**Goal:** make the application use the approved target model end-to-end without retaining obsolete persistence concepts merely for compatibility.

1. Reconfirm the target commit and work from a new feature branch based on the exact remote `demo1` SHA. Preserve unrelated work; do not use force-push or rewrite unrelated history.
2. Apply the target-first schema and required system seed to an empty, isolated disposable MySQL database. Keep the destructive reset path explicitly gated by environment and database identity.
3. Align package-by-feature Entities, composite keys, Repositories, owning Services and transactions to the target table/column contract.
4. Align catalog and APIs to Product identity, explicit parent/child Products, typed descriptive attributes, row-owned SKU/price/stock and active-phone lifecycle.
5. Align Cart, checkout, Order, voucher, Payment, shipping and snapshots to the authenticated, stateless-quote, integer-VND and idempotency contracts.
6. Align procurement and inventory to Product IDs, the resolved operational warehouse, guarded balances, append-only movements, source deduplication and atomic audit.
7. Align public/admin DTOs and frontend types/API clients/screens. Do not keep a parallel wire contract whose identifiers or money semantics contradict the target.
8. Seed system roles/permissions through migrations. Keep demo fixtures separate; use external configuration for bootstrap SUPERADMIN credentials.

## 3. P3 — Acceptance and hardening

Required evidence on the exact candidate SHA:

- Fresh MySQL install creates precisely the approved logical table set and passes PK/FK/unique/check/default/index assertions.
- Backend entity and repository mappings validate against the created schema.
- Auth/RBAC, Product/attribute, Cart ownership, checkout repricing, idempotency, voucher limits, Order/COD/shipping, receiving, stock ledger and audit pass unit/integration tests.
- Concurrent stock changes, duplicate receipt confirmation, same-key order requests, conflicting payloads, voucher final-use race and injected rollback are tested on MySQL.
- Integer-VND totals and discount allocation reconcile across line, order, payment, refund, report and frontend display.
- Order-time Product/address/voucher/image snapshots remain stable after source records change.
- Frontend lint, type-check, build and representative responsive workflows pass using the target DTOs.
- CI verifies the exact candidate SHA. Report each workflow/test result and any unverified item accurately.

## 4. P4 — Integrate and close

- Review the full diff for duplicate abstractions, direct cross-module Repository writes, dead code, unneeded compatibility branches and secrets.
- Confirm no test relies on an unapproved table/field or old contract.
- Open a focused PR into `demo1`, attach exact-SHA checks and acceptance evidence, and merge only through the repository's accepted process.
- Reconfirm the merged SHA and rerun required checks against it.

## 5. Scope and safety constraints

- The target is single-merchant, COD-only, one operational warehouse in v1 and manual shipping.
- Guest checkout, persistent checkout quotes, stock reservations, catalog-targeted vouchers, per-account voucher quota ledgers, payment/shipping event tables, detailed item-level return workflows and other unapproved tables are out of scope.
- Clean Schema Reset authorizes destructive work only against a specifically verified disposable development/test database. It never authorizes resetting production, staging, shared integration or persistent business data.
- Owner approval freezes behavior; it does not imply implementation or tests have passed.
