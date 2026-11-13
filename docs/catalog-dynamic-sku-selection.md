# Product catalog and dynamic SKU selection — implementation status

Date: 2026-11-13 (Asia/Ho_Chi_Minh). Branch: `feature/catalog-dynamic-sku-selection`, based on `demo1` at `5c22e6c7b2ce6e03f41c60a658b45ab17b9135cc`. The latest user instruction authorizes a new branch and overrides the prompt's earlier prohibition on branch creation. The subsequent owner instruction authorizes committing and pushing this feature branch. No PR, merge or change to demo1 is included.

## 1. Discovery before implementation

| File/module | Existing implementation | Gap | Change? | Reason |
|---|---|---|---|---|
| CatalogSpecifications | Public pagination selects all ACTIVE Products | Child rows appear separately; direct Option filters miss child-only matches | Yes | Root-only predicate plus one correlated family-SKU EXISTS containing all selected Options |
| PublicCatalogQueryService | Database paging, batched thumbnails, row-owned summary | Query predicates need changing; summary projection is already suitable | Keep orchestration | No child expansion or FE post-pagination filtering |
| PublicCatalogController/CatalogProductFilter | Existing bracketed attribute_filters[CODE]=VALUE contract | No new route or parameter needed | Keep | Filter parser and invalid-value handling reused |
| ProductFamily detail | ACTIVE undeleted root/children with independent price/gallery/stock | Already supplies SKU identity and availability | Keep | Direct child detail still loads its whole public family |
| ProductAttributeValueDto/ReadService | Attribute/Option identity and label | Defining flag and Attribute order absent | Yes | Add is_variant_defining and sort_order |
| CatalogMetaService | Already returns Attribute flags/options/order | No gap | Keep | Existing metadata contract is sufficient |
| ProductAttributeValueValidator | Validates Option identity/ownership and one Option per Attribute | No family-level combination consistency/uniqueness | Add family validator | Protect create/update/activation/reparent/metadata changes |
| ProductFamilySelector/model/detail screen | COLOR/SIZE-specific state and matching | Cannot select arbitrary Attribute sets | Yes | Generic Attribute-ID to Option-ID selection with centralized resolution |
| CatalogBrowse/hooks/service | Uses API pagination totals without removing children | No FE filtering needed | Keep | Root paging is the backend responsibility |
| Admin list | Manages root and child Product rows | No requested change | Keep | Public summary semantics must not alter admin visibility |
| DevSeedCatalogData | Existing COLOR/SIZE definitions have defining=false | Seed cannot exercise dynamic axes | Yes, seed only | New development seeds use the existing metadata flag |
| Schema/migrations | Existing parent ID, Attribute flags and Option assignments | Sufficient model | No | No table/column/index/migration change required |

Search/name, category, brand and price continue to use root fields. Searching child-only names or matching child-only prices has not been introduced. Attribute filters may match the sellable root or an ACTIVE undeleted child, but all selected Options must belong to the same SKU.

## 2. Implemented behavior and validation

- Public list returns one ACTIVE undeleted root per row. Count/total_pages are calculated by the database from those roots. Summary does not return family.members.
- Detail reuses the existing family response. Attribute-value records add `is_variant_defining` and Attribute `sort_order`; no endpoint is added.
- FE axes and Options come from actual public family values with defining=true, ordered by metadata. Letter and numeric size values and arbitrary non-size Attributes use the same algorithm.
- Earlier metadata-ordered axes constrain later axes; changing an earlier value clears incompatible successors. Missing selection never auto-selects a size or a SKU. A complete combination auto-resolves only if exactly one ACTIVE member matches. Stock cannot conceal a duplicate combination. Purchases additionally require positive stock and the detail response for the routed Product ID.
- A root without defining values is an explicit Product choice, never a wildcard. Families with no defining values use explicit SKU buttons rather than inferred combinations. This preserves existing sellable records while metadata is reviewed; no production normalization is performed.
- With defining axes present, ACTIVE members must have the same complete axis set and unique Option tuples. The empty root is the explicit exception above. Draft/non-public rows can be prepared independently; activation and reparenting revalidate the affected family. Metadata changes revalidate ACTIVE families. Existing one-Option-per-Attribute/ownership checks remain.
- Product writes share-lock Attribute metadata, lock affected roots in ascending ID order, then lock the member. Metadata edits use exclusive metadata locks. Option/children/gallery decisions after a lock wait use current locking reads. Attribute/gallery removals operate on the already locked entities so Spring Data derived deletes cannot read an old MySQL snapshot.
- No automatic SKU generation, category-specific size rules, new framework, unrelated Admin API change, cart/checkout rewrite or new design-pattern layer is included.

## 3. API examples

The IDs/codes below are illustrative, not captured database responses. Family: root100=BLACK/M, child101=BLACK/L, child102=WHITE/M. Root identification/price remain the summary values.

| Request | Expected rows |
|---|---|
| GET /api/v1/catalog/products?page=1&page_size=20 | Root100 once; never101/102 as separate rows |
| GET /api/v1/catalog/products?q=Tee | Matching roots only; q matches root names |
| GET /api/v1/catalog/products?attribute_filters[COLOR]=WHITE&attribute_filters[SIZE]=M | Root100 |
| GET /api/v1/catalog/products?attribute_filters[COLOR]=WHITE&attribute_filters[SIZE]=L | No match |
| GET /api/v1/catalog/products/100 | Root100 row detail and ACTIVE public family100/101/102 |
| GET /api/v1/catalog/products/102 | Child102 row detail and the same public family; selected Options come from102 |

Summary response example:

```json
{"data":[{"product_id":100,"parent_product_id":null,"sku":"TEE-BLACK-M","name":"Tee","slug":"tee","thumbnail":null,"category":null,"brand":null,"selling_price":100000,"status":"ACTIVE"}],"meta":{"page":1,"page_size":20,"total":1,"total_pages":1}}
```

Root/child detail retain all existing fields. The following is an excerpt showing the additive Attribute record and family identity (other existing detail/member fields omitted):

```json
{"data":{"product_id":102,"parent_product_id":100,"attribute_values":[{"attribute_id":1,"attribute_code":"COLOR","attribute_name":"Màu sắc","is_variant_defining":true,"sort_order":1,"attribute_value_id":12,"value":"WHITE","label":"Trắng"}],"family":{"root_product_id":100,"members":[{"product_id":100},{"product_id":101},{"product_id":102}]}}}
```

Endpoint status: public list query behavior changes; public/admin detail records share the additive Attribute-value metadata; existing metadata endpoint, detail routes and Admin list remain available. Product/Attribute write payload shapes are unchanged; invalid defining combinations now receive409. No public child detail route is removed.

## 4. Verification actually obtained

- `npm ci --no-audit --no-fund`: succeeded; no dependency/version request was added.
- `npm run build`: PASS for production TypeScript and Vite after the production FE changes.
- `npm run test:selection`: PASS. New pure model coverage includes nine letter/numeric size combinations, one/three arbitrary axes, sellable root/child, missing selection, incompatible choices, sold-out state, ambiguity including an out-of-stock duplicate, empty root, standalone and immutability.
- `git diff --check`: PASS on the local candidate.
- Independent source reviews found early-MySQL-snapshot risks; the Option, child-existence and gallery paths were corrected and re-reviewed without further actionable findings in those paths. Source review does not prove runtime.
- Backend compile/tests: BLOCKED, not PASS. Automatic approval review rejected an unexpected connection to `dc.services.visualstudio.com`. The offline attempt with optional telemetry opt-outs was also rejected. No further Java/Gradle retry was made.
- Frontend lint: BLOCKED/result not verified because the same telemetry destination triggered automatic rejection while collecting the run. Do not infer lint success from the selection test passing.
- Browser: regression source was extended for dynamic one/three-axis selection, exact Cart Product ID, empty root, ambiguity, stock, child URLs, gallery/keyboard and responsive behavior. The run has no accepted result, and the later extended scenarios have not been executed. Mark BLOCKED/NOT_VERIFIED.
- Backend `DynamicCatalogHttpTests`: seven new HTTP/service/concurrency tests written, NOT_RUN. They cover roots/counts/search/price/Option filtering, hidden/deleted children, detail metadata, admin child visibility, duplicate/incomplete/status/reparent rejection and rollback, metadata collapse, empty root, and three coordinated MySQL snapshot scenarios. Existing catalog/cart/quote regression suites have not been rerun on this candidate.

## 5. Acceptance matrix

“Source” is a static implementation check, not an executed API/browser test. No AC with unverified API/browser behavior is declared fully accepted.

| ID | Test origin / evidence | Execution and result |
|---|---|---|
| AC-01 roots only | New DynamicCatalogHttpTests summary scenario | NOT_RUN; source reviewed |
| AC-02 search family | New summary scenario; existing catalog tests retained | NOT_RUN; source reviewed |
| AC-03 child-only Option | New summary scenario | NOT_RUN; source reviewed |
| AC-04 same-SKU conjunction | New WHITE/M positive, WHITE/L negative scenario | NOT_RUN; source reviewed |
| AC-05 totals/pages | New two-root page_size1 scenario | NOT_RUN |
| AC-06 root sellable | New selection model check PASS; existing root Cart browser check retained | Unit PASS; browser not verified |
| AC-07 child chosen | New model checks PASS; existing exact child Cart assertion retained | Unit PASS; browser not verified |
| AC-08 letter sizes | New selection test S/M/L | PASS |
| AC-09 trouser numeric sizes | New selection test28/30/32 | PASS |
| AC-10 shoe numeric sizes | New selection test39/40/42 | PASS |
| AC-11 one axis | New one-axis model and generic one-axis browser fixture | Unit PASS; browser not verified |
| AC-12 arbitrary axes | New three-axis model and browser fixture | Unit PASS; browser not verified |
| AC-13 absent combination | New model negative matching/reset checks; browser partial selection retained | Unit PASS; browser not verified |
| AC-14 sold out | New model availability check; existing browser stock guard retained | Unit PASS; browser not verified |
| AC-15 ambiguity | New model duplicate including sold-out duplicate; new backend duplicate rejection | Unit PASS; API NOT_RUN |
| AC-16 direct child | New API detail scenario; existing browser direct child URL retained | NOT_RUN / NOT_VERIFIED |
| AC-17 standalone | New model check; existing browser standalone fixture retained | Unit PASS; browser not verified |
| AC-18 search/filter/paging regression | New summary scenario + existing catalog suites | NOT_RUN |
| AC-19 Admin children | New summary test asserts Admin child visibility | NOT_RUN |
| AC-20 Cart/Checkout | Existing exact Product ID browser extended; existing Cart/quote API tests retained | NOT_VERIFIED / NOT_RUN |

## 6. Database, Git and remaining gate

Schema: unchanged. Applied migrations: unchanged. Development seed: only existing SIZE/COLOR flags changed to true. No live/shared database was read, reset, normalized or changed during this task; test SQL above is source only. Existing business data with missing/wrong defining metadata or invalid combinations needs an operator-reviewed cleanup, not an automatic migration.

The owner has now authorized a single commit and push on the new feature branch. demo1 and the prior feature branch are not edited. No PR, merge, CI success or deployment is claimed. The implementation is PARTIAL / not runtime-accepted until backend, lint, browser and relevant Cart/quote tests can run with an authorized telemetry-free runtime or explicit permission resolving the automatic rejection.

## 7. Changed files

- `.gitignore`
- `backend/src/main/java/com/fido/config/devseed/DevSeedCatalogData.java`
- `backend/src/main/java/com/fido/modules/product/dto/response/ProductAttributeValueDto.java`
- `backend/src/main/java/com/fido/modules/product/repository/AttributeRepository.java`
- `backend/src/main/java/com/fido/modules/product/repository/ProductAttributeValueRepository.java`
- `backend/src/main/java/com/fido/modules/product/repository/ProductRepository.java`
- `backend/src/main/java/com/fido/modules/product/service/AttributeCatalogService.java`
- `backend/src/main/java/com/fido/modules/product/service/CatalogSpecifications.java`
- `backend/src/main/java/com/fido/modules/product/service/ProductAdminService.java`
- `backend/src/main/java/com/fido/modules/product/service/ProductAttributeValueReadService.java`
- `backend/src/main/java/com/fido/modules/product/service/ProductFamilyValidationService.java`
- `backend/src/main/java/com/fido/modules/product/service/ProductImageAdminService.java`
- `backend/src/test/java/com/fido/modules/product/DynamicCatalogHttpTests.java`
- `docs/04-api-contract.md`
- `docs/05-dto-contract.md`
- `docs/15-technical-decisions.md`
- `docs/catalog-dynamic-sku-selection.md`
- `frontend/package.json`
- `frontend/src/features/catalog/components/ProductFamilySelector.tsx`
- `frontend/src/features/catalog/model/productFamilySelection.ts`
- `frontend/src/features/catalog/types/index.ts`
- `frontend/src/screens/ProductDetailScreen.tsx`
- `frontend/tests/product-detail-cart-contract.mjs`
- `frontend/tests/product-family-selection.ts`
