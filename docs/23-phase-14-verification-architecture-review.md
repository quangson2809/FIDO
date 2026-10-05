# 23 — Phase 14: verification and architecture review

Date: 2026-10-05. Branch: `feature/phase-2-3-image-persistence`.
Reviewed implementation HEAD: `cabe4eaa0cb97922fdb14d8d59b5fc3657239aba`.
Review scope: existing Product image implementation through Phase 13, including its Cart/Checkout/Order consumers, V4 migration, contracts and tests. This is not a whole-backend audit. The Phase 14 diff adds verification only, plus the branch CI trigger.

## Status

**STATUS: PARTIAL — runtime verification blocked. DONE: NO.**

Local Java is 17.0.20. The wrapper initially failed downloading Gradle 9.3.1 with `java.net.SocketException: Network is unreachable`, before compilation/test execution. No MySQL server or Docker executable was available locally. A standard curl download obtained the configured Gradle 9.3.1 distribution. Running that distribution with `--no-daemon compileJava test check` failed during build configuration: Gradle could not resolve `org.springframework.boot:org.springframework.boot.gradle.plugin:4.0.3` from the Gradle Plugin Repository. No compile task or test ran; this is not evidence of a source compilation failure. Production dependency versions were not changed.

The Phase 14 work was committed locally as `bc5f8ec`. Automatic approval review rejected the subsequent push to the GitHub remote because explicit authorization to export the changed repository contents to that destination was required. The branch CI trigger is prepared locally, but no CI success for these changes is claimed. `git diff --check` passed. The new tests have not been compiled or executed.

## Scope and source mapping

- `product` owns `products`, `product_images`, image upload/mutations and current cover reads.
- `cart` consumes the current cover through Product's read contract; `order` owns `order_items.image_url_snapshot` and historical reads.
- API #29/#30 and the approved upload/delete/reorder refinements in docs/04, DTOs in docs/05; read consumers API #8/#9/#11/#12/#14/#19/#20/#22/#23/#27/#28.
- V4 defines non-negative order, unique `(product_id,sort_order)` and nullable historical image snapshots.
- docs/19–21 govern snapshot immutability, remote retention, authorization and upload validation.
- The attached original engineering kit predates the current image refinements. Its 77-API baseline does not remove the explicitly approved image routes in current docs/04.
- No production API, schema, dependency, domain rule or security setting changes in this phase.

## Structural review

| Question | Evidence and conclusion |
|---|---|
| Business logic in Controller? | `AdminProductController` binds/validates requests, derives actor from JWT, calls owned services and wraps DTOs. No gallery mutation, provider call or repository access in the controller. |
| God ProductService? | Reads live in `AdminCatalogQueryService`/`PublicCatalogQueryService`; upload orchestration in `ProductImageUploadService`; image commands in `ProductImageAdminService`; provider translation in `ImgBbImageStorageClient`. `ProductAdminService` still owns Product/Variant commands and PATCH gallery replacement: a responsibility concentration to monitor, not evidence requiring a broad refactor. |
| ImgBB leaks into Domain? | Provider response records/key/timeouts remain in the adapter. `ProductImage` and `OrderItem` store URL strings, no ImgBB IDs/delete tokens. `ImageStorageGateway.UploadedImage` exposes only URL. MultipartFile is on the application/integration boundary, not the entity. |
| Duplicate image mapping? | Public/admin gallery DTOs both use `CatalogMapper.image`. Two entity construction sites exist for two different commands (URL replacement and uploaded append); their differing inputs/order semantics do not justify a generic mapping abstraction. |
| Image N+1? | Product lists call `representativeByProductIds` once for the page. Product detail loads one ordered gallery; Cart uses batched Product variant reads; Order list batches first OrderItem snapshots. This is source inspection plus existing test coverage, not a measured SQL-query-count result. Existing per-variant lookups elsewhere in Product commands are outside this image-read conclusion. |
| Image abstraction too broad? | Gateway has one upload operation and URL result. No asset registry/delete/GC hierarchy; consistent with the approved retention deferral. |
| Two image write paths? | **Yes.** Multipart upload appends provider URLs; Product PATCH replaces the entire collection with caller URLs. Both are explicitly approved in docs/04 and docs/05. Product creation itself has only JSON metadata/variants and rejects legacy images. Do not report a universal single-write-path architecture. |

### NOTE — two public write contracts remain intentional

Locations: `ProductAdminService.replaceImagesIfPresent` / `saveImages`, `ProductImageAdminService.appendUploadedImages`, `ProductPatchRequest.setImages` and docs/04 sections for API #30.

A caller holding CATALOG_WRITE can replace image URLs without binary upload validation. A full replacement serialized after an append can remove that appended association by design. Product locking prevents interleaved corruption, but does not provide stale-editor/version conflict detection. Eliminating URL replacement or adding version semantics would change the approved public contract and needs an explicit product decision; this review does not silently remove it.

### NOTE — remote assets are not transactionally rolled back

A successful prefix of provider uploads can remain remote after a later upload/DB failure. Local gallery writes are all-or-nothing; remote retention/cleanup is deferred in docs/20. Catalog deletion intentionally keeps assets used by historical Orders. A stored URL snapshot does not guarantee provider availability forever.

## API contract cross-check

| Contract | DTO/controller/service match |
|---|---|
| Create Product | `ProductCreateRequest`; JSON-only POST `/admin/products`, 201; no images input. |
| Upload | Multipart repeated `images` parts; POST `/admin/products/{productId}/images`, 201 + `ApiResponse<AdminProductDetailDto>`; validation of all files precedes provider calls; append assigns order. |
| Product PATCH | `ProductPatchRequest` tracks field presence; omitted images preserve gallery, empty list clears, null rejected, dense unique supplied positions required. |
| Delete image | DELETE scoped by product/image IDs; 204, absent/foreign image 404; compacts positions without remote delete. |
| Reorder | `ProductImageReorderRequest.ImageOrder(image_id,sort_order)`; PATCH, 200 detail; subsets allowed if complete resulting positions remain dense and unique. Negative/null format errors are 400; duplicate/gapped final order 409; foreign ID 404. |
| Current read models | Nullable list thumbnail; ordered full gallery in Product detail; live image/thumbnail in Cart/Checkout. |
| Historical read models | `OrderCreationService` copies checkout thumbnail; `OrderMapper` and `OrderSummaryReadService` read stored snapshots, including null. |
| Authorization/errors | CATALOG_WRITE or SUPERADMIN for mutations; adapter maps provider failure to 502, timeout 504, missing configuration 503. Secrets/provider response bodies are not returned. |

Existing `ApiBaselineRouteContractTests`, `ApiContractMatrixTests` and image HTTP tests are execution checks; static matching here is not a claim they ran successfully.

## Behavioral verification matrix

All runtime rows below require successful execution on the reviewed revision.

| Scenario | Evidence prepared |
|---|---|
| Cover deletion | `ProductImageAdminHttpTests`, `CartCheckoutImageHttpTests`: next cover promoted, dense positions, foreign/missing IDs rejected. |
| Reordering | Admin HTTP/unit tests: identity preserved, unique dense order, 409 rollback on invalid requests. Temporary positive positions avoid transient unique collisions. |
| Upload partial failure | New HTTP test succeeds once then fails; asserts no successful prefix persisted, existing gallery preserved and third upload not attempted. |
| DB failure | Existing conflict test plus new HTTP test where first insert succeeds and second violates URL column length; asserts full batch rollback and preservation of original gallery. |
| Provider timeout | Existing adapter test injects SocketTimeoutException; new HTTP test asserts 504 and unchanged gallery. These are controlled faults, not a live ImgBB availability test. |
| Historical Order | Existing Order HTTP regression creates with A, reorders/deletes A, checks customer/admin detail/list still A. Null legacy snapshots covered at persistence/read-model levels. |
| Empty gallery | Existing Product and Cart/Checkout HTTP tests assert null cover/empty images; admin delete permits last image removal. |
| Parallel reorder | New `ProductImageConcurrencyTests`: two transactions rendezvous before real Product lock, both commit requested complete permutations; final state equals one full permutation, no mixed positions/lost identities. |
| Parallel add | New concurrency tests for empty and nonempty galleries: real service proxies/DB transactions preserve both uploaded URLs, existing cover and dense positions. Provider networking is outside this persistence-concurrency test. |

The concurrency spy only synchronizes arrival before `productForUpdate` and calls the real method. It does not replace repository locking, database writes, transaction management or authorization. Worker threads install the existing CATALOG_WRITE authority and clear it on exit. Futures and rendezvous have bounded waits; executors are closed before fixture cleanup. The test profile selects H2 or MySQL using the existing TEST_DB variables.

## Flyway and execution commands

New `CleanMigrationTests` uses a unique **in-memory H2** database, never TEST_DB_URL, enables clean only on its own Flyway instance, migrates V1–V4, writes a sentinel, cleans, migrates again, validates and asserts restart applies zero migrations. Production `spring.flyway.clean-disabled=true` remains intact. This does not establish MySQL clean/backfill compatibility.

From `backend`:

```bash
./gradlew --no-daemon compileJava test check
```

The existing CI performs H2 `clean build` and MySQL 8.4 `test --rerun-tasks` with test-only database credentials, retaining each suite's XML reports. Phase 14 adds this working branch to the push trigger so evidence can be produced without merging. Existing `ProductImageOrderingMigrationTests` is H2-only even when the rest of the suite uses TEST_DB_URL; MySQL empty-schema migration and JPA mapping are covered separately by CI.

## Remaining work before PASS

- Obtain authorization for the blocked push to `quangson2809/FIDO`, branch `feature/phase-2-3-image-persistence`, then run the prepared branch CI.
- Record successful compile/test/check and H2/MySQL results for the final code revision; fix any related failures.
- Record Flyway clean/migrate execution result, distinguish H2 clean from MySQL migration verification.
- Do not equate static architecture review or a test's existence with runtime evidence.
- If a single public image write path is required, explicitly revise API #30 before implementation.
