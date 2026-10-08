# Confirmed backend hardening — verification record

Status: **PARTIAL — H2 compile/test/check passed; MySQL gate and #8 receipt command remain open**.

Branch: `fix/backend-confirmed-findings-20261007`.
Base: `aca05117d6650bb3a5eb9ef0283973cfa40e4371` (main fetched when this task began).
Implementation commits: `7148414`, `0ac8e79`; the commit containing this record also aligns runtime configuration and reference documentation.

## Scope and evidence

The implemented changes below passed the full H2 test suite. MySQL-specific behavior remains unverified.

| Finding | Implementation | Regression evidence prepared |
| --- | --- | --- |
| #1 | Remove implicit dev; reject public dev JWT key outside explicit dev-only runtime; explicit local/Compose dev selection | JwtConfigTests |
| #4 | Safe diagnostic message, method/route/numeric IDs, internal stack/cause types; concurrency failures return 409 | ApiExceptionHandlerTests |
| #5 | Sort inventory mutation lines by variantId | OrderConcurrencyTests: reversed item order across two concurrent orders |
| #7 | Account-owned pessimistic lock before current-cart creation/mutation; locking current-cart lookup | CartConcurrencyTests: simultaneous initial/subsequent adds |
| #8 | Inclusive two-day return window; no implicit stock/payment effects. Physical customer receipt wiring remains incomplete | OrderPolicyTests; OrderHardeningHttpTests: expired return leaves state/audit/payment/stock unchanged |
| #9 | Staff role replacement retains ADMIN or SUPERADMIN; existing last-superadmin guard remains | StaffHttpTests |
| #10 | Admin namespace rejects accounts without effective capability/SUPERADMIN; per-operation authorization remains | OrderHardeningHttpTests: anonymous/customer/plain admin/custom capability |
| #11 | Validate HTTPS URI on existing image association and provider-result paths; no invented host allowlist | ProductImageUrlPolicyTests; ProductImageAdminHttpTests |
| #13 | Query and execution share OrderActionPolicy, backed by OrderPolicy transitions; side effects remain in commands | OrderActionPolicyTests |
| #18 | No bulk-update global context clearing; refresh affected Inventory only; locked GoodsReceipt managed mutation | InventoryContextTests: caller remains managed, stock refreshed, rollback across lines |
| #20 | Add and updateQuantity share purchasability guard | CartConcurrencyTests: stopped/unavailable variant update rejected |

## Source boundary for #8

The DB design source `12y5Wjo2y0Ig2ncU9uPqxe7PcSlD6mZFa` fixes the two-day policy and physical receipt/inspection before CUSTOMER_RETURN_IN. This policy is settled.

The live consolidated API `1WNaHu6g_-XINTVcUvGX9vSJnpSyLff-PebkkDk_9mMk`, Appendix A #26, defines RETURN/EXCHANGE_SIZE with reason and exchange-specific variant/quantity fields. It does not encode a later receipt/inspection result or sellable received quantities. Repository rules in backend/AGENTS.md prohibit inventing public fields/actions or stock semantics. Only this receipt representation remains a material contract decision; it does not require a separate after-sales resource or table. See docs/15 for the detailed source reconciliation.

## Verification and review

- `git diff --check`: passed before this record was committed.
- Gradle 9.3.1 and genuine Java 17 were provisioned outside the repository; dependency versions were not changed.
- Initial Gradle attempts failed resolving the Spring Boot plugin. Using the environment's Java trust store resolved dependency transport without changing repository build configuration.
- `compileJava` and `compileTestJava`: passed. The initial combined run exhausted its overall limit after dependency download/compilation.
- Final `compileJava test check`: **BUILD SUCCESSFUL**, 158 tests discovered, **157 passed, 0 failed, 1 skipped**. The skipped test is CleanMigrationTests.cleanThenMigrateRebuildsAnIsolatedMysqlDatabase, which requires MySQL.
- The first completed test run exposed two fixture assumptions corrected in this commit: create an isolated non-staff role instead of assuming CUSTOMER exists in seed data; expect provider URL validation to reject an oversized URL with 502 and roll back earlier image inserts.
- Environment-only test launcher settings: UTC timezone and Byte Buddy agent preloaded at JVM startup (Mockito self-attachment is unavailable here). These settings were supplied through an external Gradle init script, without changing application dependencies or repository test behavior. The final run used cached dependencies with `--offline`.
- Reproduction in this environment: `gradle --offline --no-daemon --console=plain -I test-runtime.gradle compileJava test check`; the init script configures Test JVM arguments `-Duser.timezone=UTC` and `-javaagent:<resolved byte-buddy-agent-1.17.8.jar>`. Standard repository CI uses Java 17 on Ubuntu UTC and does not need this environment-specific launcher.
- No MySQL runtime was available locally. H2 does not establish MySQL locking correctness; the MySQL concurrency gate remains required.
- Existing CI runs the full H2 suite followed by MySQL 8.4 migration/mapping/transaction tests. The branch was added to its push trigger; CI has not run for these changes.
- Reviewed changed services, security/configuration and test fixtures against the base. Cross-module writes go through services; no foreign repository/entity dependency was introduced. Stock changes and ledger writes remain in the same caller transaction. No schema, endpoint, request field or payment state rule was added.
- Logs intentionally retain safe category messages and original stack frames rather than raw exception messages that can contain SQL values or provider credentials.

This review covers the branch diff, not an assertion that the whole backend is defect-free.

## Deferred and unchanged

#2 COD policy, #6 order idempotency contract/schema strategy, #14 phone canonicalization and #23 phone-change authentication remain untouched. #16/#17/#21/#22/#24/#25 were not mechanically changed. Existing DB environment wiring was retained and made available to non-dev startup after removal of the implicit dev profile.

## Publication

Changes are local commits only; no merge occurred. Automatic approval review rejected the earlier push because it publishes repository source/history externally without explicit authorization. Push was not retried through another mechanism. Explicit permission to push this branch to quangson2809/FIDO is required before remote CI can run.
