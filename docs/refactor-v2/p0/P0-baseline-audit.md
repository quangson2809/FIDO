# FIDO P0 — Baseline Audit & Scope Refactor

**STATUS: PASS — P0 AUDIT DELIVERABLES COMPLETE.** The baseline itself has a verified backend CI failure, which is recorded as an audit finding rather than hidden or repaired outside P0 scope. Local Gradle execution and the dedicated clean-target MySQL workflow could not be initiated from the available tools; actual exact-SHA GitHub Actions evidence and limitations are documented below.

- Audit date: 2026-10-22 (Asia/Bangkok)
- Repository: https://github.com/quangson2809/FIDO
- Remote branch: `demo1`
- Audited SHA: `22bd3d887cef3c077e714e5ec21e70ba89855d46`
- Reference SHA: `f931602c86fdf5a59b487d6edd77331b7d64333a`

## 1. Executive result

GitHub branch lookup confirmed `demo1`; comparing it with the supplied reference reported `ahead_by=1`, `behind_by=0`, with the reference SHA as merge base. The newer commit is titled **feat: add Clean Schema Reset target baseline**. It adds isolated target DDL/seeds/test/workflow and contract documentation. The commit does not show edits to the active `backend/src/main/resources/db/migration/**` chain or Java persistence/application source.

The target logical schema has 31 tables. The isolated target DDL `backend/src/main/resources/db/clean-reset/V1__clean_schema.sql` contains 31 distinct `CREATE TABLE` statements. The full recursive tree at the audited commit identifies exactly six files under `backend/src/main/resources/db/migration/`. V1 creates 28 tables; V5 adds `voucher_products`, `voucher_categories`, `voucher_usages`, and `checkout_quotes`; V2–V4 add constraints, role seeds, inventory setup, image ordering and the image snapshot. V6 (`V6__report_read_permission.sql`) only inserts `REPORT_READ` into `permissions`. Thus the complete active migration chain contains 32 application tables; this reconciles with source-of-truth documentation and `SchemaMappingTests`.

**Migration listing closed:** the recursive Git tree API at commit tree `e63241d91f2dd4168bc837ade15eebfce5e2631c` returned a complete non-truncated tree and confirmed V1–V6. Each migration file's purpose was inspected; V6 adds one `REPORT_READ` permission and no table.

Target DDL is under `db/clean-reset`, intentionally isolated from the active migration location until JPA, service and API mappings align. No database reset, schema-history mutation, application code change, public API change, frontend change, or design-pattern implementation was performed.

## 2. Git, environment and CI

| Item | Result |
|---|---|
| Actual remote ref | `demo1` resolved through the connected GitHub API. |
| SHA | `22bd3d887cef3c077e714e5ec21e70ba89855d46`. |
| Reference comparison | 1 commit ahead, 0 behind; merge base is the given reference SHA. |
| Local working tree | NOT INSPECTABLE; no repository checkout is mounted. No claim is made about uncommitted local changes. |
| Native Git fetch | `git ls-remote https://github.com/quangson2809/FIDO.git refs/heads/demo1` was attempted but environment DNS failed (“Could not resolve host: github.com”). |
| Combined status / exact-SHA CI | Backend verification run [#39760829809](https://github.com/quangson2809/FIDO/actions/runs/39760829809) is tied to audited SHA `22bd3d887cef3c077e714e5ec21e70ba89855d46` and concluded **failure**. Vercel status was success, but is unrelated to backend tests. |
| Backend test result | H2 workflow step: `196 tests completed, 3 failed, 1 skipped`. The failures are `CleanResetSchemaTests.developmentFixtureSeedsParentChildAttributesAndInventory`, `phoneIsUniqueButEmailIsNotUniqueInTheTargetSchema`, and `cleanThenMigrateDropsDevelopmentRowsAndReseedsSystemRows`; the errors report H2 check-constraint failures (`CK_CATEGORIES_STATUS` / `CK_ACCOUNTS_STATUS`). The MySQL test step was skipped because the H2 test step failed. |
| Local Git / Gradle | Native `git ls-remote` failed from DNS in this environment; no local checkout exists, so no local `git status`, `git diff --check` or independent Gradle invocation was made. Remote source/branch/CI evidence was obtained from GitHub's API. |
| Database/reset | NOT RUN; no DB was accessed. |

The last commit’s changed paths include the isolated target schema/seed/test, a target verification workflow and ERD/data-contract documents. It is not evidence that the old Java entities already run against the new target schema.

## 3. Stack and actual architecture

- Java toolchain 17; Spring Boot 4.0.3; Gradle Kotlin DSL.
- Spring Data JPA, Spring Security/OAuth2 Resource Server, validation, Actuator, Flyway, MySQL driver/Flyway MySQL support; H2 test runtime.
- Architecture: Modular Monolith + Package by Feature + layered structure inside each module.
- Business packages live under `com.fido.modules.<module>`; infrastructure under `com.fido.config` and `com.fido.common`.
- Intended direction: Controller → Service/Application → owning Repository. Cross-module writes use the owner module's service contract; reads use service/query/read-model contracts. Report has a documented aggregate-only JDBC exception.
- `backend/src/test/java/com/fido/common/ArchitectureBoundaryTests.java` checks field injection, controller-to-persistence, cross-module repository and entity-layer dependencies. Its existence is not proof it passed this SHA.
- Controllers are expected to return DTOs, not JPA entities.

## 4. Documentation and source paths checked

The following requested documents were retrieved from `demo1`: `backend/AGENTS.md`, `backend/ARCHITECTURE.md`, `docs/00-source-of-truth.md`, `docs/01-architecture-package-structure.md`, `docs/02-module-ownership.md`, `docs/03-data-model.md`, `docs/04-api-contract.md`, `docs/05-dto-contract.md`, `docs/06-business-rules-state-machines.md`, `docs/07-transactions-concurrency-idempotency.md`, `docs/08-security-rbac-audit.md`, `docs/09-validation-errors-conventions.md`, `docs/10-testing-strategy.md`, `docs/11-implementation-phases.md`, `docs/12-tbd-out-of-scope.md`, `docs/15-technical-decisions.md`, `docs/16-phase-7-gate.md`, `docs/design-pattern-overlap-audit-demo1.md`, and `docs/design-patterns-18-before-after-demo1.md`.

Target-specific source files also inspected: `docs/refactor/phase-1-erd-v2-approved.mmd`, `docs/refactor/phase-1-erd-v2-contract.md`, `docs/refactor/phase-1-physical-data-dictionary.md`, `docs/refactor/phase-1-owner-decision-questionnaire.md`, and `docs/refactor/clean-schema-reset-runbook.md`.

The complete, non-truncated recursive tree contains `backend/AGENTS.md` but no root `AGENTS.md`. This establishes the path is absent at the audited SHA; it does not rule out guidance supplied outside the repository.

## 5. Module and API inventory

The 77 numbered API rows in `docs/04-api-contract.md` split by owner as follows:

| Owner | Rows | Ownership |
|---|---:|---|
| account | 21 | Auth, profile/address, staff/customer back-office, roles/permissions/RBAC |
| account/order | 2 | Customer order read views across account/order boundaries |
| product | 22 | Public/admin catalog, category/brand/size/color, product/variant/image |
| cart | 5 | Cart/item queries and commands |
| order | 9 | Checkout quote, create/read/update Order, payment and after-sales actions |
| inventory | 12 | Supplier, goods receipt, inventory adjustment and movement reads |
| audit | 1 | Audit query |
| report | 1 | Report overview |
| content | 4 | Public/admin content |
| **Total** | **77** | Numbered contract rows; later owner-approved image refinements are called out separately. |

Source/controller examples retrieved include:
- account: `AuthenticationController`, `ProfileController`, `StaffController`, `RbacController`;
- product: `PublicCatalogController`, `AdminProductController`, `AdminCatalogMasterController`;
- cart: `CartController`;
- order: `CheckoutController`, `OrderCreationController`, `CustomerOrderController`, `AdminOrderController`;
- promotion: `VoucherAdminController`;
- inventory: `SupplierController`, `GoodsReceiptController`, `InventoryController`;
- audit/report/content: `AuditController`, `ReportController`, `ContentPageController`.

The recursive tree API returned a complete, non-truncated tree with 651 repository files. Under `backend/src/main/java/com/fido/modules/`, it contains 260 Java source files across the nine modules. Path-based inventory: 20 controller files, 96 DTO files, 74 service-directory files, 33 repository-directory files and 32 entity-directory Java files (30 entity/table types plus two composite-ID types). There are 84 Java files under `backend/src/test/java/`, including test support/fixture classes as well as executable test classes. Counts are file-path counts, not method counts or test-case counts; source-file and module classifications are recorded in this audit.

## 6. Legacy schema and target schema findings

### Current/source DDL

- `V1__baseline_28_tables.sql`: 28 tables — accounts, addresses, roles, permissions, account_roles, role_permissions, categories, brands, size_systems, size_values, colors, products, product_images, product_variants, carts, cart_items, vouchers, orders, order_items, payments, shipping_infos, suppliers, goods_receipts, goods_receipt_items, inventories, inventory_transactions, audit_logs, content_pages.
- `V2__phone_identity_and_system_roles.sql`: phone unique constraint and role seed; no table creation.
- `V3__inventory_receiving_guards.sql`: inventory initialization/guards; no table creation.
- `V4__product_image_order_and_order_item_image_snapshot.sql`: image sort order and nullable `order_items.image_url_snapshot`; no table creation.
- `V5__voucher_policy_and_checkout_quotes.sql`: four added tables and voucher-rule columns.
- `V6__report_read_permission.sql`: inserts the `REPORT_READ` permission; no DDL/table change.
- Complete active chain: **6 migrations**, **32 application tables** (28 in V1 plus four in V5). `SchemaMappingTests` corroborates the model logic: 30 entity-mapped tables plus two voucher element-collection tables, excluding `flyway_schema_history`.

### Source behaviors that will be affected

- `Product` currently has `size_system_id`, base price and sale metadata; `ProductVariant` has `variant_id`, parent `product_id`, `size_value_id`, `color_id`, optional SKU/override price and sale state.
- `CartItem` stores `variant_id`; `OrderItem` snapshots variant, size/color, product/SKU/price/quantity/line data and nullable image URL.
- Source `Inventory` uses `variant_id` as key and `available_quantity`; `docs/03-data-model.md` explicitly defines it as sellable availability, not physical on-hand.
- Source `Order` allows nullable `customer_account_id`, stores recipient/total/voucher/status and customer-service/cancellation/return timing fields. Source `Payment` stores due/received/refunded amounts and collection/refund actor/time.
- Source `ShippingInfo` stores `delivery_mode` and `carrier_name`; target introduces tracking/status/timestamps and omits `delivery_mode`.
- Source `InventoryTransaction` references variant/order/receipt, actor and reason. Target changes links to warehouse/product and receipt-item/order-item, introduces an idempotency key, and omits a reason column.
- V5 supports product/category voucher scopes, usage accounting and persisted quote fingerprint/expiry/order linkage. Target omits those tables.

The exact 31 target tables are listed in `P0-schema-impact-matrix.csv`.

## 7. Architecture and design-pattern observations

1. Package-by-feature and layered ownership are supported by `backend/ARCHITECTURE.md`, `docs/01-architecture-package-structure.md` and a boundary test.
2. `OrderActionService` is transactional and coordinates order state, inventory commands, voucher restore and audit; P1 must preserve atomic business operation semantics as keys change.
3. `GoodsReceiptService` is transactional and coordinates receipt, inventory and audit; duplicate confirmation must not apply stock twice.
4. `VoucherRedemptionService` uses `Propagation.MANDATORY`, locks voucher data and owns consume/restore behavior; its current supporting tables are absent from target.
5. Reporting uses aggregate reads of Order/Payment source data; all query columns/state filters must be rechecked against target.
6. The existing image provider integration uses an `ImageStorageGateway` / `ImgBbImageStorageClient` Adapter. The pattern report classifies Spring transaction/security as framework proxies and advises against gratuitous custom factories, facades, observers or generic base layers. P0 adds no patterns.

## 8. Finding classifications

| ID | Type | Finding |
|---|---|---|
| H1 | HARD BLOCK | Target requires account-owned carts/orders, but guest checkout is part of the current contract intent and target has no guest identity/session table. |
| H2 | HARD BLOCK | Public `variant_id`/size/color identifiers become child Product IDs/attributes; persistence target does not automatically authorize a breaking API change. |
| H3 | HARD BLOCK | Source sellable availability differs from target `quantity_on_hand` + version; stock meaning, concurrency and retry/ledger semantics need a frozen contract. |
| H4 | HARD BLOCK | Target omits voucher scope joins, usage ledger and checkout quote persistence; current voucher/quote behavior cannot be assumed to survive. |
| H5 | HARD BLOCK | Target requires unique `orders.idempotency_key`, while current quote flow uses quote fingerprint/expiry/order association. Define caller contract and replay semantics. |
| H6 | HARD BLOCK | Order item image/selection snapshots, payment refund attributes, order cancellation/after-sales fields and inventory reason are removed or reshaped. Confirm contract effects within the fixed table scope. |
| H7 | HARD BLOCK | Target replaces source `delivery_mode` with carrier/tracking/status/timestamp fields; shipping mode/state contract must be decided. |
| T1 | TECHNICAL DECISION | Keep architecture/module ownership; update Product/Inventory cross-module service/query contracts based on source evidence. |
| T2 | TECHNICAL DECISION | Complete target physical SQL decisions for nullability, lengths, indexes, timestamps and FK behavior from the physical data dictionary. |
| T3 | TECHNICAL DECISION | Obtain repeatable clean-target verification on a disposable MySQL database at the exact commit. |
| D1 | DEFERRED | Notification provider/template/event/retry persistence is explicitly phase-later/TBD. |
| D2 | DEFERRED | Automated shipping/payment integrations and new timeline/after-sales resources are not implied by table names. |

See `P0-risk-register.md` for controls, impact and responsible phase.

## 9. Test and CI summary

An exact-SHA GitHub Actions test run was executed automatically; it failed in the H2 test step as recorded in `P0-test-baseline.md`. The dedicated clean-target MySQL workflow did not run for this SHA (its trigger is PR/manual and the available connector exposes read operations but no workflow-dispatch action). Existing source test evidence includes:
- `SchemaMappingTests`: current mappings/table/columns/nullability and repository round-trip;
- `DatabaseConstraintsTests`: money/stock/quantity/FK/unique/state constraints and historical image snapshot;
- `ArchitectureBoundaryTests`: key dependency boundaries;
- `VoucherCheckoutHttpTests`: voucher race, retry, expiry, rollback, scopes and usage restoration;
- `CartConcurrencyTests`: concurrent add and unavailable Variant checks;
- `CleanResetSchemaTests`: new target DDL/seed/table count; source includes Flyway clean in test cleanup.

A successful Vercel status is not backend CI PASS evidence. The target schema workflow has a push trigger for `feature/clean-schema-reset`, a PR trigger into `demo1`, and manual dispatch; it has **no push trigger for `demo1`**. Run evidence for the audited SHA remains unverified.

## 10. Scope compliance and conclusion

- No schema/migration/runtime code or frontend changed.
- No DB reset or `flyway_schema_history` mutation.
- No design pattern was implemented.
- No merge/rebase/force-push was performed.
- The P0-only reports live on the separate audit branch.
- **Conclusion: PASS for P0 audit scope.** Git baseline, complete migration listing, recursive source-file inventory, 31-table target mapping, matrix, dependency map, risk register, test baseline and exit gate are committed on a separate audit branch. The baseline CI failure and missing dedicated target-MySQL run are explicitly reported; they are not misrepresented as PASS. They remain implementation/test findings for the approved follow-up phase. P1 contract decisions classified HARD BLOCK must be resolved before runtime schema implementation.
