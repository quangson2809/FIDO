# 09 — Validation, Errors & Backend Conventions

> **ERD v2 compatibility boundary (2026-10-22):** The examples below were written against the existing implementation/API. Variant, SizeSystem/SizeValue, Color and legacy field validation are source behavior, not automatic target-schema requirements. Reconcile DTO and service validators against the approved 31-table model and the frozen API/business contract; do not silently preserve or remove externally observable validation behavior.

## 1. Validation layers

Use layered validation:

1. **DTO syntactic validation**: required fields, positive/non-zero numeric constraints, max lengths where schema defines them.
2. **Service business validation**: ownership, state transition, leaf Category, SizeSystem match, permissions, stock availability.
3. **Database invariant**: FK/UQ/CHECK/atomic condition for constraints that must survive concurrent requests.

Do not place business rules only in controller annotations.

## 2. Mandatory examples

- cart/order/receipt quantity > 0;
- adjustment delta != 0;
- money >= 0;
- receiver phone + address required at checkout;
- Variant SizeValue belongs to Product SizeSystem;
- Product Category is leaf;
- Category parent update creates no self-parent/cycle;
- cannot delete Category with children/Product;
- cannot delete Brand/Size/Color while referenced;
- recipient update rejected from SHIPPING onward;
- state transition not in state machine rejected without partial write;
- COMPLETE rejected when payment is not PAID;
- inventory update rejected if result would be negative.

## 3. Business errors

SRS requires errors to be understandable and must not leak technical internals. The public error JSON envelope/status matrix is not locked in Analyst docs.

Codex must:

- use the repository's established exception/error response convention;
- centralize exception translation;
- avoid returning stack traces/SQL details/class names;
- distinguish validation/not-found/authorization/conflict/business-state conditions using the existing API standard;
- not introduce a new incompatible error schema without explicit approval.

## 4. Naming and serialization

- Java class names: normal Java conventions.
- JSON: snake_case according to API Appendix A.
- DB: snake_case.
- Target money: integer VND in BIGINT columns/DTO fields (1 stored unit = 1 VND); reject fractional VND. BigDecimal/DECIMAL money in active Java/API logic is legacy behavior and must be migrated to the owner-approved integer-VND/HALF-UP/largest-remainder contract. DECIMAL remains suitable for non-money descriptive data such as PRODUCT_ATTRIBUTE_VALUES.number_value.
- Do not map persistence Entity directly to JSON.

## 5. Search and pagination

Do not create separate search endpoints when the baseline uses query parameters. Implement default `page=1`, `page_size=20`, maximum 100. Sorting behavior not explicitly locked should follow an existing repository convention or remain an explicit decision rather than silently invented.

## 6. Deletion semantics

Use physical DELETE only where the baseline endpoint explicitly allows deleting master data and reference checks prove it is unused (e.g. empty Category, unused Brand/Size/Color/Role/Permission). Historical business records are immutable/lifecycle-driven and must not be hard-deleted.


## P1 target validation notes

- Product attribute values must contain exactly one typed value compatible with the authoritative Attribute type; OPTION must reference an option owned by that same Attribute. The final type literals/ranges are DB-02 contract items.
- Parent and child Products are independently sellable with row-owned SKU, required selling_price and stock; v1 permits one parent-child level. `name`, `slug` and `description` never implicitly fall back to parent values when NULL; do not treat arbitrary NULL as inherit.
- The target includes ORDER_ITEMS.image_url_snapshot. Historical images must not be reconstructed from the current product gallery, and a URL alone does not guarantee retained immutable bytes (DB-07).
- DB-12 lifecycle/FK defaults are owner-approved: RESTRICT for business/history references, CASCADE only for approved disposable dependent data, and preserve posted Order/Payment/ledger/audit history. Numeric retention durations/anonymization exceptions remain TBD; do not infer automatic purging.
