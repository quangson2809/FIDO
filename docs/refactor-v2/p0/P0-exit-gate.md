# P0 Exit Gate — Baseline Audit & Scope Refactor

- Audited branch: `demo1`
- Audited SHA: `22bd3d887cef3c077e714e5ec21e70ba89855d46`
- Reference SHA: `f931602c86fdf5a59b487d6edd77331b7d64333a`
- Date: 2026-10-22
- **Final status: PARTIAL — P0 must not be marked PASS.**

Legend: PASS means evidenced complete; PARTIAL means useful evidence but incomplete acceptance; BLOCKED means unavailable in the current execution environment.

| # | Acceptance criterion | Status | Evidence / outstanding item |
|---:|---|---|---|
| 1 | Verify actual remote `origin/demo1` SHA | PASS | GitHub branch lookup and commit ref resolved SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`. |
| 2 | Compare actual source with reference SHA | PASS | Compare reports 1 commit ahead, 0 behind and supplied reference as merge base. |
| 3 | Inspect working tree and preserve uncommitted local changes | BLOCKED | No local checkout/worktree mounted. No assertion about local uncommitted changes. |
| 4 | Read requested architecture/business/data/API docs | PARTIAL | The requested docs listed in P0-baseline-audit were fetched from remote. Recursive repo directory listing/root-level guide inventory unavailable. |
| 5 | Inspect every migration and DDL-count the actual source schema | BLOCKED | Retrieved V1–V5 by path; docs refer to V1–V6. No complete directory listing, so the active migration inventory and count must be independently confirmed. |
| 6 | Count target DDL tables | PASS (target file only) | Isolated target V1 contains 31 distinct CREATE TABLE statements; target test source asserts 31. |
| 7 | Inventory module/backend API contracts | PARTIAL | Module ownership and 77 numbered endpoints counted; key controllers, persistence classes and transaction services sampled. Complete recursive entity/repository/service/DTO/test inventory requires checkout/tree listing. |
| 8 | Trace ProductVariant and dependent identifiers | PASS | Source entities and DTO/API contracts confirm `variant_id`, `size_value_id`, `color_id`, `available_quantity` use; target uses child Products and typed attributes. |
| 9 | Map all target tables and legacy-only dependencies | PASS for known target/legacy set | CSV contains 31 target rows plus 8 source-only table rows and impact columns. Migration directory completeness remains a separate blocker. |
| 10 | Record Product parent/child and Attribute risks | PASS | Target DDL, ERD, physical dictionary and source entities compared; decisions stay open where contract evidence is insufficient. |
| 11 | Record warehouse/inventory key/version/ledger risks | PASS | Source Inventory/transaction semantics compared with target composite balance and ledger structure. |
| 12 | Record voucher/quote/idempotency/snapshot/payment/shipping risks | PASS | Findings classified in matrix and risk register; no unsupported runtime behavior was selected. |
| 13 | Establish module dependency graph and refactor order | PASS (logical, not exhaustive call graph) | Graph and transaction boundaries documented from architecture guides and inspected service classes. |
| 14 | Review pattern evidence without implementing patterns | PASS (source/document review) | Existing pattern/overlap reports read and examples cross-checked; no patterns were introduced. |
| 15 | Run safe Gradle compile/test/schema/architecture suites | NOT RUN | No local checkout/test environment. Commands and required environments are documented in P0-test-baseline. |
| 16 | Verify GitHub Actions run for exact SHA | PARTIAL | Combined status returned Vercel success only; available helper did not provide push-run details. Dedicated target workflow has no push trigger for demo1. |
| 17 | Cross-check source/target counts and migration history | PARTIAL | Fetched DDL gives 32 source tables and target DDL 31; the documented V1–V6 vs retrieved V1–V5 discrepancy remains open. |
| 18 | Avoid schema changes, destructive reset and scope creep | PASS | No database reset, Flyway history edit, active migration/JPA/service/controller/API/frontend change or pattern implementation. |
| 19 | Classify uncertainties correctly | PASS | Guest, Product/API IDs, stock, voucher/quote, order/payment/shipping/snapshot uncertainties remain HARD BLOCKS; engineering tasks are TECHNICAL DECISIONS; explicit later features remain DEFERRED. |
| 20 | Write audit deliverables on a separate working branch | PASS | Branch `audit/p0-baseline-erd-v2-20261022` created from verified SHA; the six P0 documents are committed there. |
| 21 | Final local diff/check/secret scan | PARTIAL | Remote branch is docs-only by intended file set; local `git diff --check`, status and secret scanning could not run without a checkout. |

## Exit decision

**P0 = PARTIAL.** There is enough evidence to prepare P1 decision closure and test planning, but not enough evidence to assert all P0 acceptance criteria passed.

### Conditions before P1 runtime implementation

1. Enumerate the complete `backend/src/main/resources/db/migration` directory on the exact audited SHA and reconcile the docs’ V1–V6 statement with the files actually present.
2. Capture a verified backend build/test result and a clean-target schema test result against disposable MySQL, with the actual workflow run/commit recorded.
3. Freeze the owner decisions for guest identity, Product child ID/API compatibility and attribute inheritance, inventory meaning/concurrency, voucher scope/usage, quote/create-order idempotency, order money/snapshot, payment/refund, shipping lifecycle, and physical SQL details.
4. Freeze API/DTO compatibility alongside schema before changing Java/frontend types.
5. Complete a recursive source inventory (entity/repository/service/controller/DTO/tests) when local Git tree access is available.

### Safety boundary

Do not run Clean Schema Reset against production, shared integration, staging, or any database with data that must remain. This P0 did not reset a database, edit `flyway_schema_history`, deploy code, or merge into `demo1`/ `main`.
