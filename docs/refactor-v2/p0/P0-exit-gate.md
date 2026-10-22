# P0 Exit Gate — Baseline Audit & Scope Refactor

- Audited branch: `demo1`
- Audited SHA: `22bd3d887cef3c077e714e5ec21e70ba89855d46`
- Reference SHA: `f931602c86fdf5a59b487d6edd77331b7d64333a`
- Date: 2026-10-22
- **Final status: PASS — P0 audit acceptance is complete.** This means the baseline was inspected and evidence/findings recorded, not that the application's CI is green. The exact-SHA backend CI result is **FAIL** and remains a tracked follow-up finding.

Legend: PASS means evidenced complete; PARTIAL means useful evidence but incomplete acceptance; BLOCKED means unavailable in the current execution environment.

| # | Acceptance criterion | Status | Evidence / outstanding item |
|---:|---|---|---|
| 1 | Verify actual remote `origin/demo1` SHA | PASS | GitHub branch lookup and commit ref resolved SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`. |
| 2 | Compare actual source with reference SHA | PASS | Compare reports 1 commit ahead, 0 behind and supplied reference as merge base. |
| 3 | Inspect working tree and preserve uncommitted local changes | NOT VERIFIABLE in this environment | No local checkout/worktree was provided. Remote branch/file state was inspected and no remote application files were changed; no claim is made about a separate local machine. |
| 4 | Read requested architecture/business/data/API docs | PASS | The recursive tree confirms every requested documentation path exists except a root `AGENTS.md`; only `backend/AGENTS.md` exists. Required docs and both design-pattern reports were read and the missing root path recorded. |
| 5 | Inspect every migration and DDL-count the actual source schema | PASS | Recursive tree at `e63241d91f2dd4168bc837ade15eebfce5e2631c` confirms V1–V6. V1 creates 28 tables, V5 adds four, V6 only inserts `REPORT_READ`; total 32 application tables. |
| 6 | Count target DDL tables | PASS (target file only) | Isolated target V1 contains 31 distinct CREATE TABLE statements; target test source asserts 31. |
| 7 | Inventory module/backend API contracts | PASS | Full non-truncated tree (651 files) was counted: 260 module Java files, 32 entity-directory files (30 entity types + two composite-ID types), 33 repository-directory files, 74 service-directory files, 20 controllers, 96 DTO files and 84 Java test/support files; 77 numbered API rows counted. Per-module counts are in `P0-module-dependency-map.md`. |
| 8 | Trace ProductVariant and dependent identifiers | PASS | Source entities and DTO/API contracts confirm `variant_id`, `size_value_id`, `color_id`, `available_quantity` use; target uses child Products and typed attributes. |
| 9 | Map all target tables and legacy-only dependencies | PASS for inspected source/target set | CSV contains 31 target rows plus 8 legacy-only table rows. Complete non-truncated tree evidence confirms all six source migrations V1–V6; inventory gap R-16 is CLOSED. |
| 10 | Record Product parent/child and Attribute risks | PASS | Target DDL, ERD, physical dictionary and source entities compared; decisions stay open where contract evidence is insufficient. |
| 11 | Record warehouse/inventory key/version/ledger risks | PASS | Source Inventory/transaction semantics compared with target composite balance and ledger structure. |
| 12 | Record voucher/quote/idempotency/snapshot/payment/shipping risks | PASS | Findings classified in matrix and risk register; no unsupported runtime behavior was selected. |
| 13 | Establish module dependency graph and refactor order | PASS (logical, not exhaustive call graph) | Graph and transaction boundaries documented from architecture guides and inspected service classes. |
| 14 | Review pattern evidence without implementing patterns | PASS (source/document review) | Existing pattern/overlap reports read and examples cross-checked; no patterns were introduced. |
| 15 | Capture verification evidence for compile/test/schema/architecture suites | PARTIAL | Exact-SHA backend H2 task ran: 196 tests completed, 3 failed, 1 skipped. The MySQL step was skipped; the dedicated clean-target MySQL workflow is NOT RUN. No local Gradle/architecture-suite invocation was available in this environment. Details are in `P0-test-baseline.md`. |
| 16 | Verify GitHub Actions run for exact SHA | PASS (result captured; baseline CI FAIL) | Actions run [#39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) is tied to the exact SHA and failed in H2; MySQL step was skipped. Vercel success is separately identified. The dedicated workflow's missing `push` trigger for direct `demo1` changes is recorded as an open CI follow-up. |
| 17 | Cross-check source/target counts and migration history | PASS | Six source migrations confirmed; source DDL total is 32 application tables; target DDL count is 31; matrix has 31 target rows and 8 legacy-only rows. CSV verification confirmed 13 columns on every row and valid quoting. |
| 18 | Avoid schema changes, destructive reset and scope creep | PASS | No database reset, Flyway history edit, active migration/JPA/service/controller/API/frontend change or pattern implementation. |
| 19 | Classify uncertainties correctly | PASS | Guest, Product/API IDs, stock, voucher/quote, order/payment/shipping/snapshot uncertainties remain HARD BLOCKS; engineering tasks are TECHNICAL DECISIONS; explicit later features remain DEFERRED. |
| 20 | Write audit deliverables on a separate working branch | PASS | Branch `audit/p0-baseline-erd-v2-20261022` created from verified SHA; the six P0 documents are committed there. |
| 21 | Final diff/secret/scope review | PASS (remote equivalent; local git checks unavailable) | Compare from the audited baseline shows exactly six added P0 report paths and no code/schema/workflow changes. All six remote files were fetched and checked for conflict markers/common credential patterns; no matches. CSV rows parse consistently. Local `git diff --check` could not run without a checkout. |

## Exit decision

**P0 = PASS (audit scope).** Complete migration listing, recursive source inventory, 31-table matrix, dependency map, risk register, exact-SHA CI status, test baseline and six-file deliverable review are complete and cross-checked. This is not a green application CI: baseline backend CI is FAIL, and the dedicated target-schema MySQL run is NOT RUN. Both are explicitly reported as follow-up findings.

### Conditions before target-schema runtime implementation (P0 audit is complete)

1. Diagnose the three `CleanResetSchemaTests` failures on the audited baseline; establish whether the cause is test-environment dialect/constraint behavior or an actual schema defect using evidence rather than assumption.
2. Run the dedicated clean-target schema test against its isolated disposable MySQL service and record the exact SHA/result. Do not run Flyway clean against shared or production data.
3. Resolve owner HARD BLOCKs before runtime schema implementation: guest identity, Product child ID/API compatibility and attribute inheritance, stock semantics/concurrency, voucher scope/usage, create-order idempotency, money/snapshot semantics, payment/refund, shipping lifecycle and physical SQL choices.
4. Freeze API/DTO compatibility alongside the schema contract. ERD v2 alone does not authorize public API changes.
5. In a normal checkout, run `git diff --check` as additional local hygiene; remote compare and content checks confirmed that this audit branch contains only the six intended P0 documents.

### Safety boundary

Do not run Clean Schema Reset against production, shared integration, staging, or any database with data that must remain. This P0 did not reset a database, edit `flyway_schema_history`, deploy code, or merge into `demo1`/ `main`. The `PASS` status is strictly for the **P0 audit deliverable** and must not be read as a claim that `demo1` backend CI passed.
