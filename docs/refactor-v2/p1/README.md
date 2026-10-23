# FIDO P1 — ERD v2 & Data Contract Freeze

**STATUS: PARTIAL — logical schema structure is confirmed; physical SQL and material business/API rules are not frozen.**

Baseline branch: demo1. This folder records the P1 design outputs. Canonical logical ERD: docs/refactor/phase-1-erd-v2-approved.mmd. Prior contract/dictionary/owner questionnaire remain their own sources; this directory summarizes and cross-checks rather than silently overwriting them.

| File | Purpose |
|---|---|
| P1-erd-v2.md | Canonical Mermaid ERD, 31-table inventory and explicit unapproved proposals. |
| P1-data-dictionary.md | Per-column types, nullability evidence, SQL draft, keys, owner, Java mapping, lifecycle and validation. |
| P1-data-dictionary.csv | Machine-readable row for every ERD column. |
| P1-decision-log.md | Approved, technical, proposed, blocked and deferred decisions. |
| P1-schema-constraints.md | PK/FK/UK/CHECK/index inventory and DB-vs-application invariant boundary. |
| P1-api-contract-mapping.csv | 77 numbered API contracts plus 10 verified current-source extensions (Product image commands, voucher CRUD and dashboard reports), with DTO/source gaps, target tables, owner decisions and acceptance tests. |
| P1-domain-invariants.md | Module/transaction domain invariants. |
| P1-test-matrix.md | Schema, integration, security, concurrency and contract acceptance matrix. |
| P1-exit-gate.md | Cross-check results and P2 readiness decision. |

## State and boundary

Owner decisions recorded on 2026-10-23 resolve DB-01, DB-02 and DB-06 through DB-11 at the business-policy level. DB-03 and DB-05 option D requests design proposals and remains unapproved until explicit owner acceptance. The owner-approved ERD fixes logical table structure, not every SQL nullability, size, default, index, FK action or state literal. D1 and D3–D10 in the owner questionnaire remain working proposals except the already-approved authenticated Cart/Order decision D2. The API map preserves the legacy 77-route baseline and explicitly calls out 10 source extensions; it does not silently make target-incompatible DTOs implementable. The decision log tracks DB-10 money rules and DB-11 system seed/bootstrap as separate owner blockers. Guest checkout and the number of operational warehouses are already resolved, not active questions.

No P2 implementation is included: no new baseline migration, no database reset, no entity/service/controller/frontend change. Existing clean-reset SQL is treated as a draft and must not be considered approved physical schema.
