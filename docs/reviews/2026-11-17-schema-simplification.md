# demo1 — schema simplification verification (2026-11-17)

Base: `ee465c1e9234f66bb7ff3368553a81fff7647992` on remote `demo1`.
Scope: the owner's ten-column removal request; schema, seed, BE, FE, current contracts and affected tests change together.

## Resulting sources of truth

| Removed storage | Replacement behavior |
| --- | --- |
| `attributes.is_variant_defining` | Selector continues to recognize exact `COLOR` and `SIZE`-prefixed codes. Remove flag from request/response types and admin forms. |
| `orders.placed_at` | Use `created_at`; both account/status time indexes move to that column. |
| `shipping_infos.recipient_name/recipient_phone` | Project shipping API recipient fields from immutable `order_addresses`; no second copy is persisted. |
| `product_images.is_primary` | Position zero is primary. Preserve dense ordering, Product locks and temporary-position flushes. Reports join the unique position-zero image. |
| `orders.currency`, `payments.currency/method` | Fixed integer VND/COD semantics remain. Keep amount, refund, state, actor/time and idempotency checks. |
| `cart_items.added_at` | Retain the line's `updated_at`. |
| `order_voucher_snapshots.discount_amount_snapshot` | Actual historical discount remains in `orders.discount_amount`; keep voucher code/type/value snapshots. |

Canonical result: 30 tables, 211 physical columns (210 ERD fields plus the existing generated phone key). All 43 foreign keys remain.

## Local verification before push

- PASS: `python scripts/p1/check_contract_consistency.py`; SQL, ERD and dictionary agree.
- PASS: Java production/test compilation and `checkJavaFormat` with Java 17 / Gradle 9.3.1.
- PASS: 159 tests across 38 focused classes, no failures/errors/skips, against local disposable MySQL 8.4.7 databases. Includes real schema constraints, entity mapping, clean migration, seed, report queries, checkout, COD collection/refund, immutable snapshots, image ordering, rollback and affected concurrency tests. This is not the full backend suite.
- PASS: rerun of `ProductImageAdminHttpTests`, `ProductImageUploadHttpTests` and `ProductImageAdminServiceTests` after removing redundant assertions; format check also passes.
- PASS: frontend lint, production build/typecheck, API integration smoke, architecture smoke, selection, render and report calculation checks.
- PASS: focused browser regressions `admin-attributes-browser.mjs`, `admin-product-management-browser.mjs`, `product-detail-cart-contract.mjs`.
- PASS: removed persistence fields have no production-source references; `git diff --check`.

Local Java tests use UTC and an explicit Mockito startup agent to accommodate this runner's attachment restrictions. Browser tests use Chromium headless shell. These are local runner settings; no repository dependency/workflow change is needed.

### Focused backend classes

- `com.fido.common.ArchitectureBoundaryTests`
- `com.fido.config.devseed.DevDataSeedServiceTests`
- `com.fido.modules.account.CustomerQueryApiTest`
- `com.fido.modules.cart.CartConcurrencyTests`
- `com.fido.modules.cart.CartItemHttpTests`
- `com.fido.modules.cart.CheckoutQuoteHttpTests`
- `com.fido.modules.order.CheckoutCartTransactionTests`
- `com.fido.modules.order.CheckoutConsistencyHttpTests`
- `com.fido.modules.order.OrderActionContractHttpTests`
- `com.fido.modules.order.OrderActionTransactionHttpTests`
- `com.fido.modules.order.OrderConcurrencyTests`
- `com.fido.modules.order.OrderHardeningHttpTests`
- `com.fido.modules.order.OrderImageSnapshotHttpTests`
- `com.fido.modules.order.OrderLifecycleHttpTests`
- `com.fido.modules.order.OrderStockHttpTests`
- `com.fido.modules.order.service.lifecycle.OrderActionMatrixTests`
- `com.fido.modules.order.service.lifecycle.OrderActionPolicyInvariantTests`
- `com.fido.modules.product.AdminProductDetailQueryTests`
- `com.fido.modules.product.DynamicCatalogHttpTests`
- `com.fido.modules.product.ProductAttributeValueHttpTests`
- `com.fido.modules.product.ProductCoreHttpTests`
- `com.fido.modules.product.ProductCreateWorkflowHttpTests`
- `com.fido.modules.product.ProductGalleryTransactionHttpTests`
- `com.fido.modules.product.ProductImageAdminHttpTests`
- `com.fido.modules.product.ProductImageConcurrencyTests`
- `com.fido.modules.product.ProductImageTransactionHttpTests`
- `com.fido.modules.product.ProductImageUploadHttpTests`
- `com.fido.modules.product.repository.ProductImageRepositoryTests`
- `com.fido.modules.product.service.ProductImageAdminServiceTests`
- `com.fido.modules.report.ReportApiTest`
- `com.fido.modules.report.repository.ReportRepositoryTests`
- `com.fido.persistence.CleanMigrationTests`
- `com.fido.persistence.CleanTargetEntityMappingTests`
- `com.fido.persistence.DatabaseBaselineTests`
- `com.fido.persistence.DatabaseConstraintsTests`
- `com.fido.persistence.MigrationTests`
- `com.fido.persistence.ProductImageOrderingMigrationTests`
- `com.fido.persistence.SchemaMappingTests`

## Deployment boundary

Follow the repository's single pre-release baseline policy. V1's checksum changes; an existing old database cannot be treated as upgraded merely by restarting the new source. Rebuild only a verified disposable dev/test database, or separately review a data-preserving upgrade for persistent/shared data. No existing deployment/shared database was reset or modified by this task. Do not use Flyway repair to hide a physical-schema mismatch.

GitHub Actions is checked on the pushed commit separately; local PASS does not assert a remote run has completed.
