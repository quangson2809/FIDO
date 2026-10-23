# FIDO P1 — ERD v2 / UC / API Contract Reconciliation

- **Status: PARTIAL — Phase 2 Clean Schema Reset is NOT AUTHORIZED.**
- Repository: https://github.com/quangson2809/FIDO
- Verified base: origin/demo1 at 551d91dab8b47ac709283f9222667b06c6b1b6de, fetched from GitHub on 2026-10-23.
- Working branch: docs/p1-contract-reconciliation-20261023, created from that exact SHA.
- Authority: dated owner-approved business decisions; canonical docs/refactor/phase-1-erd-v2-approved.mmd for target logical schema; this register for discrepancy disposition and open gates.

## 1. Status boundary

This work reconciles documentation against the approved target, not the legacy implementation. Current Controllers/DTOs/services and V1–V6 migrations remain evidence only. Clean-reset SQL remains isolated under backend/src/main/resources/db/clean-reset/. No database reset was run and no active migration was changed.

The current P1 inventory records 31 logical tables, 228 logical ERD fields and 229 physical SQL columns, including generated-only accounts.phone_active_key. These are snapshot counts, not invariants hard-coded for future revisions. The checker must derive expected table count from the canonical ERD and compare the complete ERD/SQL table sets.

## 2. Discrepancy register

| ID | Severity | Evidence at base SHA | Reconciliation / disposition |
|---|---|---|---|
| R-01 | BLOCKER | docs/05-dto-contract.md says the target ERD lacks ORDER_ITEMS.image_url_snapshot; current ERD, reset DDL and P1-data-dictionary.csv contain it. | Corrected to distinguish field existence from immutable asset retention. DB-07 remains blocked on stable object/version references, overwrite/delete policy, historical access and tests. |
| R-02 | MAJOR | docs/03-data-model.md says not to reintroduce image_url_snapshot although the target ERD includes it. | Re-label legacy sections as source-only and state the actual target shape. |
| R-03 | BLOCKER | docs/refactor/phase-1-physical-data-dictionary.md lists monetary fields as DECIMAL and omits newer target fields including request_fingerprint, usage_count, refund metadata and warehouse_id. | Regenerate the table inventory from canonical ERD and delegate physical details to P1-data-dictionary.csv. DB-10 selects integer VND; non-money number_value may remain DECIMAL. |
| R-04 | MAJOR | docs/refactor/phase-1-owner-decision-questionnaire.md keeps D9 working default DECIMAL(18,2) after DB-10 owner decision selected VND-only integer money. | Mark only the money portion of D9 superseded; other physical defaults remain open. |
| R-05 | BLOCKER | P1-api-contract-mapping.csv claims target ORDERS lacks request_fingerprint, ORDER_ITEMS lacks image snapshot, VOUCHERS lacks usage_count, and integer-money fields conflict with ERD. Those fields are present in current ERD/SQL/dictionary. | Correct false absence claims; retain DB-03/05/06/07/08 behavior blockers because field presence does not prove atomic semantics. |
| R-06 | MAJOR | reference/api-baseline-77.csv and reference/api-contract-matrix.csv retain optional/guest wording for APIs #14–20 while A-03 and docs/04-api-contract.md require authentication. | Align target access labels to JWT-required, while separating existing-runtime evidence from target readiness. |
| R-07 | MAJOR | API #13/#33 mappings name only generic CatalogMetaDto and omit dynamic type/option/value validation. | Add target metadata/DTO proposal from target tables. Final wire names, public visibility and filter semantics remain a DB-02/API contract gate before P2. |
| R-08 | BLOCKER | scripts/p1/check_contract_consistency.py hard-codes expected table count 31. | Derive expected count from canonical ERD and verify exact table-set equality. Exact-SHA checker/CI must pass after change. |
| R-09 | BLOCKER | ERD comments say child selling_price NULL means inherit while DB-01 records parent and child Products each have their own SKU, price and inventory; target DDL currently allows NULL. | Align to DB-01 by making selling_price required and non-inherited. Keep name/slug/description inheritance as field-specific candidates only; effective reads, parent-chain depth and parent-update propagation remain DB-01 blockers. |
| R-10 | MAJOR | Some business/transaction docs still describe Variant-keyed stock and DECIMAL money as target rules. | Mark legacy algorithms source-only and add Product-ID/integer-VND target gates. |

## 3. Target business / UC reconciliation

| Domain / UC group | Supported target contract | Legacy disposition / remaining gate |
|---|---|---|
| Account, address, RBAC, bootstrap SUPERADMIN | Phone login; active-account phone uniqueness and reuse after soft delete (DB-09); bootstrap secret external to source; RBAC writes through owning service with audit and last-SUPERADMIN protection. | Current entity has global unique phone and no target soft-delete mapping. DB-12 must approve per-entity soft/hard deletion, FK actions and history retention. |
| Category, Brand, Product hierarchy and attributes | Product IDs replace Variant IDs; parent and child Products are independently sellable with their own SKU, price and stock. Dynamic attributes are descriptive; children are created explicitly. Options must belong to the owning Attribute. | Legacy ProductVariant, SizeSystem, SizeValue and Color endpoints are breaking/target gaps. Only name/slug/description are annotated as child inheritance candidates; their effective-value and propagation rules remain blocked. No other field inherits implicitly. |
| Cart, quote and order placement | Persisted Cart and order creation require authentication. Client totals, price and stock are untrusted. Target has no CHECKOUT_QUOTES table. | Stateless advisory quote is only a DB-05 proposal until accepted. Existing frontend sends quote_id; target idempotency/fingerprint replay/conflict rules must be approved before implementation. |
| Voucher | Order-wide, non-stackable; no Product/Category targeting (DB-06). Target includes usage_limit and usage_count. | Atomic quota increment, scope, cancellation/return restoration and retry semantics remain blocked. |
| Order, money and snapshots | VND only; target monetary values are integer VND; total = subtotal − all order discounts + shipping. Target order/item/address/voucher/image snapshot fields are present. | Discount allocation/rounding and line/order reconciliation need acceptance/tests. BigDecimal in legacy services is not target wire/storage type. |
| Supplier, receipt, warehouse and ledger | One operational warehouse in v1; GOODS_RECEIPTS.warehouse_id is present; balance keys use warehouse + Product; quote/cart do not reserve stock. | DB-03 proposal is not approved: movement source/sign/reason, same-source/different-key dedupe, opening balance, cancellation/return reversal and concurrency protocol. |
| COD, shipping, cancel, return and refund | One COD Payment aggregate per Order and manual shipping; target Payment has refund metadata fields. | DB-08 state transitions, partial/full refund, idempotency, allowed actors, return/restock and audit atomicity remain blocked. |
| Audit, report and content | Audit belongs to the owning mutation transaction where required; reports/content remain within existing domain scope. | DB-12 deletion/FK/history retention and numeric retention periods are not approved. Do not add event/history tables without owner amendment. |

## 4. Dynamic catalog metadata — target proposal

Keep existing route candidates: public GET /api/v1/catalog/meta (#13) and admin GET /api/v1/admin/catalog/meta (#33). The legacy size_systems/size_values/colors payload is not the target payload.

Target metadata should expose ATTRIBUTE_TYPES, ATTRIBUTES and nested ATTRIBUTE_OPTIONS needed to render attribute controls. Definitions include attribute ID/code/name/type, is_required, is_variant_defining (informational only; no variant auto-generation) and sort_order. Options include option ID, owning attribute ID, value, label and sort_order, ordered by sort_order then stable ID. Public metadata may expose only product-facing/non-sensitive rows; because no visibility flag exists, private operational metadata must not be stored in these master tables.

For value input/read, the candidate mapping is exactly one of OPTION → option_id, TEXT → text_value, NUMBER → number_value, BOOLEAN → boolean_value. Validate type match and same-attribute option ownership. number_value is descriptive numeric data, not money. Do not invent attribute filter operators or auto-create Product rows from option combinations. Exact enum literals, public JSON casing, response envelope and filtering capabilities are a proposal to freeze before P2, not implemented behavior.

## 5. Product field-by-field inheritance register

| Field | Current evidence / disposition |
|---|---|
| sku | Unique identity per Product; never inherits. |
| selling_price | Each parent and child owns a price per DB-01; required and non-inherited in target DDL after this reconciliation. |
| name | ERD marks child NULL as an inheritance candidate; effective value and parent-update propagation are undecided. |
| slug | ERD marks child NULL as an inheritance candidate; uniqueness and effective URL behavior are undecided. |
| description | ERD marks child NULL as an inheritance candidate; fallback and propagation are undecided. |
| category_id, brand_id | No inheritance annotation. Do not infer parent values; nullability/requiredness remain DB-01/DB-09 contract items. |
| status, deleted_at, cost_price, images, attribute values, inventory | No inheritance behavior is approved; use row-owned value and explicit lifecycle rules. |
| parent_product_id | Parent must exist and hierarchy must be acyclic. Maximum depth and whether a parent may itself be a child remain DB-01 blockers. |

## 6. API/DTO inventory reconciliation

- reference/api-baseline-77.csv is the legacy route inventory. P1 target readiness is represented by docs/refactor-v2/p1/P1-api-contract-mapping.csv, not the old runtime PASS status.
- APIs #14–20 are JWT-required under A-03. Guest sessions, anonymous persisted carts, guest lookup and cart merge are out of target scope.
- APIs #31–32 (variant create/update) and #40–45 (size/color masters) cannot be backed by target tables absent from the ERD. They are target contract gaps/breaking changes; do not add legacy tables silently.
- APIs #13/#33 must replace size/color metadata with dynamic attribute metadata. Catalog, Cart, Order, GoodsReceipt and Inventory target contracts use Product IDs, not variant_id.
- “Mapped” in a CSV means documentation mapping only; it does not prove runtime implementation, authorization or tests.

## 7. Roadmap and design-pattern decision

1. Finish document reconciliation and owner review.
2. Close DB-03, DB-05, DB-12 and remaining DB-01/02/07/08/09/10 physical/API details. Do not start a destructive reset before this gate.
3. Run Clean Schema Reset only in a verified disposable, empty development/test MySQL database; keep the location isolated until target mappings are ready.
4. Implement backend foundation/auth/RBAC and owning-module boundaries.
5. Implement Catalog + dynamic attributes + parent/child Product rules.
6. Implement Inventory + Goods Receipt + ledger concurrency.
7. Implement Cart, quote, Voucher, Order, COD and integer-VND accounting.
8. Implement manual Shipping, cancel/return/refund, Audit/Report/Content.
9. Align frontend feature DTOs/services with the accepted API contract; preserve presentation while removing unsupported legacy behavior.

P1 does not implement patterns. Source review identifies an Adapter-style image-storage boundary as present; Spring transaction/security proxies are framework mechanisms, not custom GoF patterns; Order transition policy/command dispatch is related structure, not full GoF State/Command. Add a GoF pattern in a later phase only when a concrete use case justifies it. See docs/design-pattern-overlap-audit-demo1.md and docs/design-patterns-18-before-after-demo1.md.

## 8. Verification and acceptance state

- Base SHA and branch creation: verified via GitHub API.
- Static checker after reconciliation: PENDING; this report does not claim it ran.
- MySQL clean-reset/backend CI: prior green runs quoted in older records are historical evidence, not proof for the reconciliation commit. Exact-SHA rerun is required.
- Target Entities/Repositories/services/API/DTO/frontend: NOT ALIGNED / NOT IMPLEMENTED; P1 documentation does not claim these pass.
- DB-03, DB-05 and DB-12 remain hard blockers; P1 is PARTIAL and P2 is NOT AUTHORIZED until owner decisions and exact-SHA evidence are complete.
