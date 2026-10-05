# 23 — Phase 14: verification and architecture review

Date: 2026-10-05. Branch: `feature/phase-2-3-image-persistence`.
Initial reviewed implementation: `cabe4eaa0cb97922fdb14d8d59b5fc3657239aba`. Verified code revision: **`629c37c639c25b678ed5a346300621dcfdd1e314`**.
Review scope: existing Product image implementation through Phase 13, including its Cart/Checkout/Order consumers, V4 migration, contracts and tests. This is not a whole-backend audit. The Phase 14 diff adds verification, the branch CI trigger and one malformed-input validation fix. Subsequent report/evidence publication changes documentation only.

## Status

**STATUS: PASS for the scoped Phase 14 verification and architecture review at `629c37c639c25b678ed5a346300621dcfdd1e314`. DONE: YES.**

The revision is published on the requested branch. Push via Git CLI lacked a credential helper; the authorized GitHub connector published the exact local tree (`936608dea28163dbd0f748c326e6cc8c6b0ff078`) without force-updating history. Actual backend push run: https://github.com/quangson2809/FIDO/actions/runs/37298988932 . Job `111726929276` completed successfully. Checkout logs show the exact revision above, not a pull-request merge revision. Both commands executed compileJava, test and check; H2 also built the application.

| Suite | Discovered | Passed | Skipped | Failures/errors |
|---|---:|---:|---:|---:|
| H2 | 139 | 138 | 1 | 0/0 |
| MySQL profile | 139 | 139 | 0 | 0/0 |

The one H2 skip is the explicitly MySQL-only clean/migrate case; that case executed successfully in the MySQL step. Pure unit tests and explicitly H2-backed tests remain such even in the MySQL-profile run.

JUnit XML artifacts: H2 `11340960037`, MySQL `11340739442`. Parsed suite/case evidence and archive SHA-256 values are committed in [evidence/phase14-629c37c.json](evidence/phase14-629c37c.json). H2 logged BUILD SUCCESSFUL at `2026-10-05T10:51:44Z`; MySQL at `2026-10-05T10:53:04Z`.

## Resolve-plugin root cause and correction

The detailed Gradle log identifies the failed request as:

```text
Could not GET https://plugins.gradle.org/m2/org/springframework/boot/org.springframework.boot.gradle.plugin/4.0.3/org.springframework.boot.gradle.plugin-4.0.3.pom
request to {tls}->http://browser-proxy:8889->https://plugins.gradle.org:443
Caused by: java.net.SocketException: Network is unreachable
```

The environment had `GRADLE_OPTS` pointing HTTP/HTTPS proxy properties at `browser-proxy:8889`. The earlier JAVA_TOOL_OPTIONS attempt did not override these Gradle command-line proxy properties. The correction was run-local: derive the host/port from the environment's working HTTPS_PROXY and set GRADLE_OPTS to that proxy, preserving localhost in nonProxyHosts. Subsequent Gradle output records successful plugin/dependency downloads; no repository, plugin version or application dependency change was needed.

The next independent local blocker was a **JRE-only installation**: `java -version` reported 17.0.20, but `javac` was absent, and Gradle could not find a Java 17 compiler toolchain. CI uses setup-java with Temurin **JDK 17**. No code change can repair a missing compiler installation; verification therefore uses the explicitly pinned CI revision.

## Scope and source mapping

- `product` owns `products`, `product_images`, image upload/mutations and current cover reads.
- `cart` consumes the current cover through Product's read contract; `order` owns `order_items.image_url_snapshot` and historical reads.
- API #29/#30 and the approved upload/delete/reorder refinements in docs/04, DTOs in docs/05; read consumers API #8/#9/#11/#12/#14/#19/#20/#22/#23/#27/#28.
- V4 defines non-negative order, unique `(product_id,sort_order)` and nullable historical image snapshots.
- docs/19–21 govern snapshot immutability, remote retention, authorization and upload validation.
- The attached original engineering kit predates the current image refinements. Its 77-API baseline does not remove the explicitly approved image routes in current docs/04.
- No API shape, schema, dependency, domain rule or security setting changes. One production input-validation fix rejects null elements in Product PATCH images as HTTP 400 instead of letting a null entry reach service dereferencing.

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

`ApiBaselineRouteContractTests`, `ApiContractMatrixTests`, `ApiResponseJsonContractTests` and the image HTTP suites all passed in both runs. `ArchitectureBoundaryTests` also passed; the manual structural findings above remain independently assessed rather than inferred from that test alone.

## Behavioral verification matrix

Every row below passed in the H2 and MySQL-profile artifacts of the pinned push run. Transaction/concurrency HTTP/service tests use MySQL 8.4 in the latter; provider errors remain fault-injected as described.

| Scenario (PASS) | Executed evidence |
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

`CleanMigrationTests` runs the clean/migrate cycle on a unique in-memory H2 database and, in the MySQL CI profile, a newly created `phase14_clean_<UUID>` MySQL database. The MySQL test requires a loopback test server, creates a unique database without IF NOT EXISTS, runs cleanup only after CREATE succeeds, then drops that owned database. It never cleans the shared `fido_test` schema or an externally configured production schema. Production `spring.flyway.clean-disabled=true` stays intact.

Both cases passed. The MySQL XML identifies the isolated database as `phase14_clean_a0899a72599a48dea5eaee1cdb9f44a4`, logs successful clean and two successful V1–V4 migrations, and the testcase has no failure/skip. MySQL concurrency and rollback XML separately identify `jdbc:mysql://127.0.0.1:3306/fido_test` and MySQL 8.4.

Both cases migrate V1–V4, write a sentinel, clean, migrate V1–V4 again, validate, check the sentinel was erased and check restarting applies zero migrations. Existing V3→V4 legacy ordering backfill test is H2-only; do not confuse that with the new MySQL full clean/migrate test.

Actual CI commands from `backend`:

```bash
# H2
./gradlew --no-daemon clean compileJava test check build
# MySQL 8.4, TEST_DB_URL points at fido_test on the job service
./gradlew --no-daemon compileJava test check --rerun-tasks
```

Tests for HTTP rollback and service concurrency inherit the existing test profile and therefore run against the real MySQL service in the second step. Provider failures are intentionally injected at the gateway/HTTP-client boundaries; no live ImgBB credentials are required. Each suite retains separate JUnit XML artifacts.

## Write-path convergence and invariant analysis

| Concern | Multipart upload | Product PATCH replacement | Shared point / consequence |
|---|---|---|---|
| Entry | `AdminProductController.uploadImages` → `ProductImageUploadService.upload` | `AdminProductController.updateProduct` → `ProductAdminService.updateProduct` | HTTP validation and existing CATALOG_WRITE/SUPERADMIN rule; no repository access in Controller. |
| Transaction | `ProductImageAdminService.appendUploadedImages:49` after remote uploads | `ProductAdminService.updateProduct:135` covers metadata + replacement | Both transactional commands; provider calls do not hold DB locks. |
| Serialization | `references.productForUpdate:54` before reading current gallery | `references.productForUpdate:140` before replacement | Both reach `CatalogReferenceService.productForUpdate` → `ProductRepository.findByIdForUpdate`, locking the **same Product row**, including when gallery is empty. |
| Persistence | Appends via ProductImageRepository.save | Deletes old associations and saves requested collection | Same ProductImageRepository, table, FK, non-negative constraint and unique `(product_id,sort_order)`. **They do not converge in one image application service.** |
| Dense order | Server appends starting at current count; relies on valid pre-existing dense gallery | `requireNormalizedImageOrder:307` checks dense supplied positions | Dense ordering is a service invariant; DB uniqueness/non-negativity alone cannot enforce no gaps. Reorder validates final positions and then normalizes; delete compacts. |
| Mapping | Uploaded URL → ProductImage, alt text null | Supplied URL/alt text/order → ProductImage | Two small entity-construction loops remain. Public/admin response mapping is shared in CatalogMapper.image. |
| Audit/history | PRODUCT_UPDATE in same transaction, no Order write | PRODUCT_UPDATE in same transaction, no Order write | OrderItem stored snapshots remain authoritative; provider assets are retained. |

**Duplication:** there is repeated entity assignment and a repeated conceptual dense-order check in replacement versus reorder; neither is secretly centralized. Reorder checks the merged current/requested permutation while replacement validates a complete new collection. They currently agree, and existing invalid-order tests exercise both. A generic mapper would not centralize the differing write policies. No new abstraction or broad refactor is required to explain these two approved operations.

**Bypass:** PATCH deliberately accepts caller-provided URL strings and therefore does not execute binary MIME/signature/size/provider validation. That is allowed by docs/04 and docs/05, not a universal provider-only guarantee. Both HTTP mutation routes still enforce authorization and their gallery-order constraints. No evidence in these reviewed paths shows bypass of Product locking, local transaction atomicity or Order snapshot ownership. Direct SQL can create gaps (the old rollback fixture deliberately does), so this report does not claim the DB enforces dense order by itself.

**Discovered defect fixed:** `ProductPatchRequest.images` previously permitted null list elements; `ProductAdminService.requireNormalizedImageOrder` dereferenced each element, yielding 500 for `images:[null]`. `List<@NotNull ProductImageInput>` now rejects that malformed entry at the HTTP boundary. `patchRejectsNullImageEntryBeforeChangingGallery` verifies 400 and unchanged IDs.

## Final review and limits

- No remaining BLOCKER/MAJOR defect identified in the reviewed image scope. The null-element defect is fixed and its HTTP regression passed on both databases.
- No new architecture layer, broad image abstraction, schema, dependency or weakened security setting was introduced.
- Two approved write contracts and small repeated entity-assignment/dense-order logic remain, with the convergence and constraints explicitly documented above. This is not a single image-command-service architecture.
- Remote orphan cleanup, live provider availability, stale-editor versioning and V3 legacy-data backfill on MySQL are not proven by these tests. Full clean/migrate V1–V4 on MySQL is proven. The existing V3 backfill test runs on H2.
- Flyway emits a compatibility advisory that MySQL 8.4 is newer than its latest verified 8.1 version; the observed migration/rollback/concurrency tests nevertheless passed. No unrequested version upgrade was made.
- Image N+1 assessment combines source inspection and batched-query unit/repository tests; it is not a production load test or SQL profiler trace.
- Any requirement to eliminate URL-based PATCH or require a single application-level write entry point needs an explicit contract change. Current docs/04–05 approve the two operations.
