# 22 — Phase 13 Product Image Test Suite — 2026-10-05

## Scope

Phase 13 adds risk-based verification for the Product-image refinement already implemented in the backend. It does **not** introduce a new API, schema, storage provider, authorization rule, image lifecycle, or Order behavior.

The locked invariant with the highest regression risk is:

```text
Product image change != historical Order image snapshot change
```

Catalog, Cart and Checkout read the current Product cover. Order creation copies that current cover into `OrderItem.image_url_snapshot`; every later Order read must use the stored snapshot rather than the current Product gallery.

## Risk model

| Risk | Failure consequence | Test level | Evidence |
|---|---|---|---|
| `sort_order` becomes sparse/duplicated during mutation | wrong cover, DB conflict, unstable gallery | Unit + Repository + HTTP | `ProductImageAdminServiceTests`, `ProductImageRepositoryTests`, `ProductImageAdminHttpTests` |
| cover lookup depends on image id or per-row query | wrong thumbnail or N+1 on paged lists | Repository + Unit/query-service + HTTP | `ProductImageRepositoryTests`, `ProductImageReadServiceTests`, `PublicCatalogQueryServiceTests`, `ProductReadModelHttpTests` |
| removing/reordering cover leaves invalid ordering | wrong Product/Cart/Checkout image | Unit + HTTP | `ProductImageAdminServiceTests`, `ProductImageAdminHttpTests`, `CartCheckoutImageHttpTests` |
| provider failure leaves local ProductImage state | catalog points to failed upload | Service + HTTP | `ProductImageUploadServiceTests`, `ProductImageUploadHttpTests` |
| DB failure after provider success leaves local partial state | local transaction is partially committed | HTTP integration | `ProductImageTransactionHttpTests` |
| unauthorized caller mutates images or invokes provider | security/side-effect regression | HTTP integration | `ProductImageAuthorizationHttpTests`, `ProductImageUploadHttpTests`, `ProductImageAdminHttpTests` |
| multipart validation/binding changes silently | upload contract regression | HTTP integration | `ProductImageUploadHttpTests` |
| Order creation chooses the wrong image | incorrect immutable Order history | Unit + HTTP regression | `OrderCreationImageSnapshotTests`, `OrderImageSnapshotHttpTests` |
| Product cover changes rewrite historical Order presentation | historical data corruption | End-to-end regression | `OrderImageSnapshotHttpTests` |

## Unit suite

### Product image mutation

`ProductImageAdminServiceTests` verifies:

- append continues dense `sort_order` without replacing the existing cover;
- removing `sort_order = 0` promotes the next image and normalizes the remaining collection;
- reorder can intentionally select a new cover and ends with dense `0..n-1` ordering;
- conflicting final positions are rejected before mutating the collection;
- normalization exercises the temporary-order + flush strategy used to avoid transient collisions with `UNIQUE(product_id, sort_order)`.

### Cover read

`ProductImageReadServiceTests` verifies:

- representative image lookup de-duplicates Product IDs;
- one batched repository query is used for multiple Product IDs;
- an empty request produces no persistence call.

### Order image snapshot selection

`OrderCreationImageSnapshotTests` verifies that the current checkout cover is copied into the persisted `OrderItem.image_url_snapshot` at Order creation.

## Repository suite

`ProductImageRepositoryTests` verifies:

- gallery ordering is `sort_order ASC`;
- cover query selects `sort_order = 0`, not the smallest `image_id`;
- duplicate `(product_id, sort_order)` is rejected at persistence flush.

`DatabaseConstraintsTests` remains the schema-level guard for non-negative `sort_order` and uniqueness per Product.

`PublicCatalogQueryServiceTests.publicProductPageLoadsCoversWithOneBatchLookup` verifies the paged Product list requests all covers through one `ProductImageReadService` batch call and performs no per-Product gallery repository calls. This is the query-structure guard against an image N+1 regression.

## Integration suite

### Provider success/failure

- `ImgBbImageStorageClientTests`: provider response translation, HTTP failure, timeout and malformed-response behavior.
- `ProductImageUploadServiceTests`: request-order upload, supported signatures, validation-before-upload, and no persistence command after provider failure.
- `ProductImageUploadHttpTests`: multipart success, provider failure -> gateway error, and no persisted image after failure.

### DB rollback

`ProductImageTransactionHttpTests` fault-injects a persistence conflict after a successful provider upload and verifies that no new `product_images` row is committed. The remote upload is deliberately not asserted as rolled back because remote asset cleanup is a separate deferred lifecycle concern.

### Authorization and multipart

Existing image HTTP suites verify that Catalog read-only principals cannot mutate images and that multipart file validation occurs before the storage provider is called.

## API/read-model coverage

| API/read boundary | Test |
|---|---|
| Product List | `ProductReadModelHttpTests` |
| Product Detail | `ProductReadModelHttpTests` |
| Cart | `CartCheckoutImageHttpTests` |
| Checkout | `CartCheckoutImageHttpTests` |
| Customer/Admin Order | `OrderImageSnapshotHttpTests` |
| Admin Product List | `ProductReadModelHttpTests` |
| Admin Product Detail | `ProductReadModelHttpTests` |
| Add Image | `ProductImageUploadHttpTests` |
| Remove Image | `ProductImageAdminHttpTests` |
| Reorder / cover selection | `ProductImageAdminHttpTests` |

## Regression invariant

`OrderImageSnapshotHttpTests.createdOrderKeepsImageSnapshotAfterCoverChangeAndDeletion` is the primary regression guard:

1. Product cover A exists and Order is created.
2. `OrderItem.image_url_snapshot` stores A.
3. Product gallery is reordered so cover B becomes current.
4. The old Product image A is removed from the active catalog collection.
5. Product/Cart/Checkout may now use B, while customer/admin Order detail and list responses must continue to use A.

This intentionally proves that current Catalog presentation and historical Order presentation have different lifecycles.

## Phase exit criteria

Phase 13 is PASS only when:

- unit, repository, integration and API image tests pass;
- both H2 build verification and MySQL migration/mapping/test verification pass;
- the Product image change != Order snapshot change regression remains green;
- no production architecture or security boundary is weakened to make tests pass.
