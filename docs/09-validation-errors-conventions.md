# 09 — Validation, Errors & Backend Conventions

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
- Money: BigDecimal/DECIMAL semantics.
- Do not map persistence Entity directly to JSON.

## 5. Search and pagination

Do not create separate search endpoints when the baseline uses query parameters. Implement default `page=1`, `page_size=20`, maximum 100. Sorting behavior not explicitly locked should follow an existing repository convention or remain an explicit decision rather than silently invented.

## 6. Deletion semantics

Use physical DELETE only where the baseline endpoint explicitly allows deleting master data and reference checks prove it is unused (e.g. empty Category, unused Brand/Size/Color/Role/Permission). Historical business records are immutable/lifecycle-driven and must not be hard-deleted.
