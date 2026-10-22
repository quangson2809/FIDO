# P0 — Test and CI Baseline Report

Audited remote ref: `demo1` at `22bd3d887cef3c077e714e5ec21e70ba89855d46`  
Date: 2026-10-22  
**Execution status: NOT RUN / evidence-limited.** Source-level existence is not counted as a passing test.

## 1. Execution limits

- Remote branch/ref SHA was verified with the connected GitHub API.
- Local `git ls-remote https://github.com/quangson2809/FIDO.git refs/heads/demo1` failed because this environment could not resolve `github.com`.
- No local checkout or working tree is mounted; therefore no Gradle command, local status/diff check or SQL migration run was performed.
- No database connection/reset was attempted.
- The combined status endpoint for the audited SHA returned a Vercel check of `success` only. This is not evidence of backend CI PASS.
- The available workflow-run helper returns PR-triggered runs only; an empty result does not prove no push workflow ran.

## 2. Commands from checked-in workflow/config

`backend/build.gradle.kts` configures Java 17, JUnit Platform, Spring Boot 4.0.3, H2 test runtime and MySQL runtime/test usage. These command lines come from the actual workflow files.

| Command/check | Environment | Result | Evidence / limitation |
|---|---|---|---|
| `./gradlew --no-daemon clean compileJava test check build` in `backend/` | Java 17, Gradle wrapper/dependency access and H2 test environment | **NOT RUN** | Exact H2/build step from `.github/workflows/backend-verification.yml`; no local checkout. |
| `./gradlew --no-daemon compileJava test check --rerun-tasks` in `backend/` | Java 17 + disposable MySQL 8.4 service and workflow env | **NOT RUN** | Exact MySQL step from backend workflow; do not connect it to a shared database. |
| `./gradlew test --tests com.fido.persistence.CleanResetSchemaTests --stacktrace` in `backend/` | Java 17 + isolated, empty, disposable MySQL DB configured by `CLEAN_RESET_TEST_DB_*` | **NOT RUN** | Exact target-schema workflow step; test source invokes Flyway clean in cleanup, so environment isolation is mandatory. |
| `git diff --check` and `git status --short` | Local checkout | **NOT RUN** | No checkout/worktree. Remote audit branch changes are verified through GitHub commit/file reads instead. |
| Legacy V1 DDL count | Repository file inspection | **PASS for fetched file** | 28 distinct CREATE TABLE statements in `V1__baseline_28_tables.sql`. |
| Legacy V2–V4 DDL | Repository file inspection | **SOURCE INSPECTED** | V2 adds phone uniqueness/role seed; V3 inventory guards; V4 image ordering and item image snapshot. |
| Legacy V5 DDL | Repository file inspection | **SOURCE INSPECTED** | Creates four tables: voucher_products, voucher_categories, voucher_usages and checkout_quotes. |
| Target clean-reset V1 table count | DDL inspection | **PASS for target file** | Exactly 31 distinct CREATE TABLE statements in isolated `db/clean-reset`; target test source asserts 31. |
| Complete migration-directory enumeration | Recursive checkout needed | **BLOCKED** | Documentation references V1–V6 while only V1–V5 paths were retrievable through this interface; no directory listing API is available. |
| GitHub combined status | Remote endpoint | **PARTIAL** | Vercel = success; no backend Actions check surfaced in this response. |
| GitHub Actions run verification | Exact-SHA run details | **NOT VERIFIABLE** | Available helper only surfaces PR-triggered runs and returned none; no inference that no push run exists. |

## 3. Existing source test inventory

| Test source | Evidence from code | Actual result |
|---|---|---|
| `backend/src/test/java/com/fido/persistence/SchemaMappingTests.java` | Compares 30 JPA entity-owned tables with ownership map; adds two voucher element-collection tables and expects 32 application tables; checks entity-to-table mapping, columns/nullability, repository round-trip and timestamps. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/persistence/DatabaseConstraintsTests.java` | Nonnegative stock/money, positive quantity/nonzero movement, FK/UQ/status checks, image ordering and nullable historical image snapshot. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/common/ArchitectureBoundaryTests.java` | Checks field injection, controller-to-persistence dependency, cross-module repository imports and entity layer leakage. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/modules/order/VoucherCheckoutHttpTests.java` | Same-quote retry, voucher usage/restore, last-use concurrency, stale/expired quote, account mismatch, scoped voucher behavior, rollback. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/modules/cart/CartConcurrencyTests.java` | Concurrent cart creation/add and unavailable Variant/quantity update rejection. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/persistence/CleanResetSchemaTests.java` | Exact target table count, fresh clean target, system seed, dev fixture and phone/email uniqueness behavior. Its cleanup invokes Flyway clean. | Source inspected; **NOT RUN**. |

## 4. CI trigger observation

`.github/workflows/backend-verification.yml` includes push branches for `demo1` and multiple feature branches and defines an H2 build plus MySQL migration/mapping test. The target workflow `.github/workflows/clean-reset-schema-verification.yml` has:
- push trigger only for `feature/clean-schema-reset`;
- pull-request trigger targeting `demo1` and `docs/phase-1-erd-v2-freeze`;
- manual `workflow_dispatch`;
- no direct push trigger for `demo1`.

The trigger shape is a configuration fact; whether a relevant PR or dispatch run has passed for the audited SHA remains unverified by accessible run metadata. Do not report either workflow PASS/FAIL without its run.

## 5. Correct interpretation

- A checked-in test is not a passing test.
- Vercel success is not backend Java build/test evidence.
- Target-schema tests use a separate clean-reset location and do not prove current JPA mappings work with target DDL; the commit states those mappings remain isolated pending integration.
- No test failure is attributable to this audit because no test ran.
- P0 remains **PARTIAL** until complete migration listing and exact-SHA build/test/workflow evidence are available.
