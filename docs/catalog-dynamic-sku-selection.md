# Catalog parent summaries and color/size selection

Status: corrected implementation; runtime verification of this revision is pending CI. Owner clarification on 2026-11-13 overrides the earlier generic-attribute and manual-SKU selection behavior.

Branch: feature/catalog-dynamic-sku-selection. Reference demo1: 5c22e6c7b2ce6e03f41c60a658b45ab17b9135cc. The owner has authorized commit/push on this feature branch; demo1 is not modified or merged.

## 1. Confirmed behavior

- Customer selects only color and/or size, depending on the actual family. Material/capacity/finish and other Attributes are descriptive.
- COLOR is the exact color role; Attribute codes starting with uppercase SIZE identify size roles (SIZE, SIZE_SHOES, SIZE_GIAY, etc). Size values are read from assigned Options of this family: letter sizes, trouser numbers and shoe numbers are data, not category-specific code or a shared global size menu.
- Parent is both the display representative and one ordinary sellable combination. Its color/size tuple follows exactly the same rule as children.
- Customer never chooses an SKU. SKU/Product ID is the internal result of resolving a complete, unique combination.
- No manual SKU buttons, separate root choice, empty-parent exception or direct child URL bypass remains. Missing/ambiguous combinations cannot be purchased. A sold-out duplicate cannot make a tuple look unique.
- Standalone Products without variants remain purchasable. Active multi-member families require at least one COLOR/SIZE axis, a complete consistent axis set for every member including the parent, and unique tuples. Draft/non-public rows can be prepared before activation.

## 2. Source discovery and change map

| File/module | Existing state | Result |
|---|---|---|
| CatalogSpecifications | Public list paged all Products; Option checks matched the returned row | Parent-only DB paging; all selected Options must match one ACTIVE undeleted member using EXISTS |
| PublicCatalogQueryService | Batched summary reads and existing family detail | Reused; no summary child expansion |
| Controller/filter | Existing attribute_filters[CODE]=VALUE parser | Reused; no route or request parameter added |
| Detail DTO/read service | Row/family identity, stock and Option data available | Added is_variant_defining and Attribute sort_order; purchase roles remain COLOR/SIZE only |
| CatalogMetaService | Existing metadata/options/order | Reused |
| ProductFamilyValidationService | Earlier implementation allowed an empty parent and generic defining axes | Parent and children now share complete, unique COLOR/SIZE tuples; no empty-axis multi-member family |
| ProductAdminService / repositories / gallery | Post-wait reads could retain MySQL snapshot state | Current locking reads and deletion of locked entities protect values, hierarchy and gallery replacement |
| Selector/model/detail screen | Earlier implementation exposed manual SKU/root choices | Only actual color/size controls; complete unique Product ID resolution, including direct child routes |
| CatalogBrowse/hooks/service | Uses backend page data/meta | Reused; no child filtering after pagination |
| Admin list | Root/child administration | Unchanged |
| Seed | COLOR/SIZE defining flags false | Development seed flags true; no applied migration/business-data edits |

Search, category, brand and price continue to use parent fields. Searching child-only names or child-only prices is not introduced. Attribute equality filters may still use other descriptive Attributes; every requested Option must match the same family member.

## 3. API contract and examples

- GET /api/v1/catalog/products: query semantics change to parent-only; response shape stays the same.
- GET /api/v1/catalog/products/{productId}: parent and direct child detail remain available, with existing family.members. Attribute records add is_variant_defining and sort_order.
- Metadata routes already supply the required definitions. Admin list and write request payload shapes are unchanged. Invalid active family combinations are rejected with409.

Illustrative family: root100 BLACK/M, child101 BLACK/L, child102 WHITE/M. IDs below are examples, not captured production output.

| Request | Expected result |
|---|---|
| /api/v1/catalog/products?page=1&page_size=20 | Root100 once; no separate101/102 summaries |
| /api/v1/catalog/products?q=Tee | Matching root names only |
| /api/v1/catalog/products?attribute_filters[COLOR]=WHITE&attribute_filters[SIZE]=M | Root100 |
| /api/v1/catalog/products?attribute_filters[COLOR]=WHITE&attribute_filters[SIZE]=L | No result |
| /api/v1/catalog/products/100 | Parent detail with own BLACK/M values and public family |
| /api/v1/catalog/products/102 | Child detail with own WHITE/M values and same public family |

Summary response example:

```json
{"data":[{"product_id":100,"parent_product_id":null,"sku":"TEE-BLACK-M","name":"Tee","slug":"tee","thumbnail":null,"category":null,"brand":null,"selling_price":100000,"status":"ACTIVE"}],"meta":{"page":1,"page_size":20,"total":1,"total_pages":1}}
```

Attribute record excerpt from either parent/child detail:

```json
{"attribute_id":2,"attribute_code":"SIZE","attribute_name":"Kích thước","is_variant_defining":true,"sort_order":2,"attribute_value_id":21,"value":"M","label":"M"}
```

## 4. Verification and acceptance tracking

Previous candidate0b1075bc: remote frontend lint/typecheck/build passed; API and architecture smoke passed; render smoke failed because tests still called the replaced function signature. That test is corrected in this revision without weakening matching assertions. These earlier results do not prove the corrected revision.

Current revision: diff/source review and the repository CI results are the required evidence. Local Java/Gradle and further local test reruns remain avoided after unsolicited Windows telemetry to dc.services.visualstudio.com was rejected, including an offline attempt. Existing Ubuntu CI is used for backend/MySQL and frontend verification. Do not mark a check PASS until its run actually completes.

| AC | Scenario / evidence | Required check |
|---|---|---|
|01|Parent-only summary|DynamicCatalogHttpTests summary query|
|02|Search does not expose children|Summary HTTP scenario|
|03|Child-only Option returns root|Summary HTTP WHITE/M case|
|04|Options on different members cannot combine|Summary HTTP WHITE/L negative case|
|05|Counts/pages count roots|Two roots, page_size1 HTTP case|
|06|Parent tuple remains purchasable|Selection model root assertion + browser root Cart ID|
|07|Child tuple resolves correct ID|Selection model + browser child Cart ID|
|08|Letter sizes|Selection model S/M/L|
|09|Trouser sizes|Selection model28/30/32|
|10|Shoe sizes|Selection model39/40/42 + size-only browser|
|11|One axis only|Color-only and size-only model/browser cases|
|12|Non-color/size Attributes|Updated acceptance: MATERIAL/capacity must NOT become purchase axes, per owner clarification|
|13|Missing combination|Model/reset and browser incomplete-selection guards|
|14|Sold out|Model and direct child browser quantity/availability checks|
|15|Duplicate tuple|Backend rejection and frontend blocking; no manual SKU fallback|
|16|Direct child URL|Detail API + browser; duplicate tuple remains blocked|
|17|Standalone|Model and browser retained|
|18|Search/filter/paging regression|Existing catalog tests plus new query scenario|
|19|Admin children|Existing root-picker tests and new Admin child visibility assertion|
|20|Cart/Checkout|Browser exact Product ID plus existing Cart/quote regression|

New backend coverage includes duplicate/missing tuples, activation/reparent rollback, color/size matching regardless descriptive flags, missing-parent rejection, and coordinated snapshot tests for option replacement, hierarchy and gallery clear. Existing hierarchy/detail test fixtures now use valid distinct parent/child color combinations; test outcomes are not hidden by changing the expected business rules.

## 5. Database, scope and delivery

No schema, table, dependency, applied migration or live-data change. Only development-seed metadata is changed. Incorrect existing parent/child assignments require explicit data repair, not automatic SKU generation or guessed size-category rules.

Excluded: arbitrary purchase axes, manual SKU fallback, unsellable display-only parent, frontend post-pagination deduplication, global size lists and category hard-coding.

The feature branch contains the implementation and tests. Completion depends on CI evidence for this revision; no merge into demo1, deployment or PR creation is implied.

## 2026-11-14 follow-up: size Attribute prefix

The owner now explicitly allows any code starting with SIZE to participate in combination selection. FE and BE use the same case-sensitive prefix, while COLOR stays exact. The shared frontend predicate also removes these values from the general specifications block, so a SIZE_SHOES value appears as a size selector rather than beside status/descriptive fields.

Added regressions: exact SIZE and multiple prefixes, non-prefix controls, incomplete/duplicate tuples, API parent/child detail and family filtering, and browser selection of SIZE_SHOES with exact child Cart ID and no duplicate specifications label. Public HTTP conflicts remain CONFLICT; internal validation reasons are not added to the error contract. Runtime results for this follow-up must be read from the associated CI runs; older green runs do not prove this revision.
