# P0 — Test and CI Baseline Report

Audited remote ref: `demo1` at `22bd3d887cef3c077e714e5ec21e70ba89855d46`  
Date: 2026-10-22  
**Execution status: baseline CI FAILED; tests were executed.** Source-level existence is not counted as a passing test. The result below is from GitHub Actions run #39760829809 tied to the exact audited SHA.

## 1. Execution limits

- Remote branch/ref SHA was verified with the connected GitHub API.
- Local `git ls-remote https://github.com/quangson2809/FIDO.git refs/heads/demo1` failed because this environment could not resolve `github.com`; GitHub API branch and recursive tree reads succeeded.
- No local checkout or working tree is mounted; therefore no local Gradle invocation, `git status` or `git diff --check` was performed.
- No database connection/reset was attempted.
- GitHub Actions run [#39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) is tied to the exact audited SHA and failed in the H2 test step. Combined commit status had Vercel `success`, unrelated to backend correctness.
- The complete recursive Git tree lists all six active migrations V1–V6, including V6's `REPORT_READ` permission seed.

## 2. Commands from checked-in workflow/config

`backend/build.gradle.kts` configures Java 17, JUnit Platform, Spring Boot 4.0.3, H2 test runtime and MySQL runtime/test usage. These command lines come from the actual workflow files.

| Command/check | Environment | Result | Evidence / limitation |
|---|---|---|---|
| `./gradlew --no-daemon clean compileJava test check build` in `backend/` | Java 17, Gradle wrapper/dependency access and H2 test environment | **FAIL (CI #39760829809)** | Exact H2/build workflow command; 196 tests completed, 3 failed, 1 skipped. |
| `./gradlew --no-daemon compileJava test check --rerun-tasks` in `backend/` | Java 17 + disposable MySQL 8.4 service and workflow env | **SKIPPED by workflow** | The step was skipped because the preceding H2/build step failed; no MySQL migration/mapping conclusion can be drawn. |
| `./gradlew test --tests com.fido.persistence.CleanResetSchemaTests --stacktrace` in `backend/` | Java 17 + isolated, empty, disposable MySQL DB configured by `CLEAN_RESET_TEST_DB_*` | **NOT RUN against MySQL** | The dedicated target-schema workflow did not run for this SHA; only its command and safe database restrictions are source-verified. No database reset was performed by this audit. |
| `git diff --check` and `git status --short` | Local checkout | **NOT RUN** | No checkout/worktree. Remote audit branch changes are verified through GitHub commit/file reads instead. |
| Legacy V1 DDL count | Repository file inspection | **PASS for fetched file** | 28 distinct CREATE TABLE statements in `V1__baseline_28_tables.sql`. |
| Legacy V2–V4 DDL | Repository file inspection | **SOURCE INSPECTED** | V2 adds phone uniqueness/role seed; V3 inventory guards; V4 image ordering and item image snapshot. |
| Legacy V5 DDL | Repository file inspection | **SOURCE INSPECTED** | Creates four tables: voucher_products, voucher_categories, voucher_usages and checkout_quotes. |
| Target clean-reset V1 table count | DDL inspection | **PASS for target file** | Exactly 31 distinct CREATE TABLE statements in isolated `db/clean-reset`; target test source asserts 31. |
| Complete migration-directory enumeration | GitHub recursive tree API | **PASS** | The complete non-truncated tree for audited tree SHA `e63241d91f2dd4168bc837ade15eebfce5e2631c` lists exactly six migrations V1–V6. V6 inserts `REPORT_READ`; it adds no table. |
| Backend GitHub Actions run for audited SHA | Remote Actions API + job log | **FAIL** | Run #39760829809, head SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46`. The H2 test step failed and MySQL verification was skipped. |
| Dedicated clean-target MySQL workflow | Workflow run history | **NOT RUN / tool limitation** | No target-schema run was recorded for the audited SHA. The checked-in workflow supports push on `feature/clean-schema-reset`, PR into `demo1`/`docs/phase-1-erd-v2-freeze`, and manual dispatch; this session's connector can inspect run metadata but cannot dispatch a workflow. |

## 3. Existing source test inventory

| Test source | Evidence from code | Actual result |
|---|---|---|
| `backend/src/test/java/com/fido/persistence/SchemaMappingTests.java` | Compares 30 JPA entity-owned tables with ownership map; adds two voucher element-collection tables and expects 32 application tables; checks entity-to-table mapping, columns/nullability, repository round-trip and timestamps. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/persistence/DatabaseConstraintsTests.java` | Nonnegative stock/money, positive quantity/nonzero movement, FK/UQ/status checks, image ordering and nullable historical image snapshot. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/common/ArchitectureBoundaryTests.java` | Checks field injection, controller-to-persistence dependency, cross-module repository imports and entity layer leakage. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/modules/order/VoucherCheckoutHttpTests.java` | Same-quote retry, voucher usage/restore, last-use concurrency, stale/expired quote, account mismatch, scoped voucher behavior, rollback. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/modules/cart/CartConcurrencyTests.java` | Concurrent cart creation/add and unavailable Variant/quantity update rejection. | Source inspected; **NOT RUN**. |
| `backend/src/test/java/com/fido/persistence/CleanResetSchemaTests.java` | Exact target table count, fresh clean target, system seed, dev fixture and phone/email uniqueness behavior. Its cleanup invokes Flyway clean. | Three methods failed on the H2 workflow; the exact MySQL target-schema run is still missing. |

## 4. CI trigger observation

`.github/workflows/backend-verification.yml` includes push branches for `demo1` and multiple feature branches and defines an H2 build plus MySQL migration/mapping test. The target workflow `.github/workflows/clean-reset-schema-verification.yml` has:
- push trigger only for `feature/clean-schema-reset`;
- pull-request trigger targeting `demo1` and `docs/phase-1-erd-v2-freeze`;
- manual `workflow_dispatch`;
- no direct push trigger for `demo1`.

The trigger shape is a configuration fact. The backend workflow did run for the audited SHA and failed in its H2 test step. The dedicated target-schema workflow did not run for this SHA; do not infer a PASS or MySQL failure from that absence.

## 5. Correct interpretation

- A checked-in test is not a passing test.
- Vercel success is not backend Java build/test evidence.
- Target-schema tests use a separate clean-reset location and do not prove current JPA mappings work with target DDL; the commit states those mappings remain isolated pending integration.
- The exact-SHA failures were observed with no source changes made in the audit branch. Failed methods and constraint messages are listed below.
- `CleanResetSchemaTests.developmentFixtureSeedsParentChildAttributesAndInventory()` failed while inserting `categories.status='ACTIVE'` with H2 reporting `Check constraint invalid: CK_CATEGORIES_STATUS`.
- `CleanResetSchemaTests.phoneIsUniqueButEmailIsNotUniqueInTheTargetSchema()` failed on an account insert with `Check constraint invalid: CK_ACCOUNTS_STATUS`.
- `CleanResetSchemaTests.cleanThenMigrateDropsDevelopmentRowsAndReseedsSystemRows()` failed while inserting categories with `Check constraint invalid: CK_CATEGORIES_STATUS`.
- These are confirmed H2-path failures. Without an isolated MySQL run, they do not establish that the target DDL fails on MySQL or that H2 incompatibility is conclusively the only cause. The baseline remains CI **FAIL** until an authorized follow-up diagnoses/corrects it.
