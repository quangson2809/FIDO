# 09 — Validation, Errors and Backend Conventions

## 1. Validation layers

1. **Request validation:** required fields, string bounds, valid enum literals, integer-VND amounts, positive quantities and request shape.
2. **Business validation:** ownership, permissions, account lifecycle, Product hierarchy, typed attribute values, price/stock eligibility, voucher rules and state transitions.
3. **Database invariants:** PK/FK/unique/check constraints, optimistic version guards and source-derived uniqueness. Database checks reinforce but do not replace service validation.

Cross-module writes must go through the owning module service. Validation and mutation that protect the same business invariant must run in one transaction or use database concurrency controls that make the invariant atomic.

## 2. Target-specific validation

### Accounts and authorization
- Registration and authentication must not reveal whether an account identifier exists.
- Active phone identity is unique; the phone may be reused after the account is soft-deleted.
- Never accept an account ID, role/grant assignment or actor identity from an unauthenticated/public request.
- Protect role/permission changes with the approved RBAC policy, audit record and last-SUPERADMIN guard.

### Product and attributes
- Product SKU is unique according to the target database contract.
- Parent/child depth is limited to one; reject self-parenting, cycles and invalid referenced parents.
- Each Product owns its required selling price and stock. No nullable field silently inherits from a parent.
- Attribute values must match the Attribute's authoritative type: `OPTION`, `TEXT`, `NUMBER` or `BOOLEAN`. Exactly one compatible value is populated. A selected option must belong to the same Attribute.
- Attribute metadata is descriptive; it must not generate Product rows automatically.
- A Product image operation validates ownership, supported media/URL contract and ordering rules from the approved image API contract.

### Cart, orders and money
- Cart and order operations require an authenticated account and enforce ownership of each Cart/line/Order.
- Cart and receipt quantities must be positive integers. Inventory adjustment delta must be non-zero with a valid reason code.
- All money is integer VND. Reject fractional-VND inputs; do not accept client-computed total/price/discount/shipping values as authoritative.
- Order creation revalidates current Product status, selling price, stock, voucher and server-owned shipping input.
- Same scoped idempotency key + same semantic payload replays. Same key + different payload conflicts. Cross-account result access is forbidden.

### Inventory, payment and lifecycle
- Inventory balance must never be negative. Every successful movement has the matching source, balance update, ledger row and required audit in one transaction.
- Prevent repeated receipt confirmation, duplicate source movements, repeated stock reversal, duplicate COD collection and duplicate refund.
- Apply the approved actor/state matrix to Order, Payment, ShippingInfo and GoodsReceipt transitions.
- Do not hard-delete placed Orders, Payment facts, ledger entries, snapshots or audit history through ordinary catalog/account deletion.

## 3. HTTP error convention

Return a stable public envelope with a machine-readable error code and safe user-facing message. Map request validation to a client validation error, authentication to 401, authorization to 403, missing resources to 404, and state/stock/idempotency conflicts to the agreed conflict status. Preserve the existing global error envelope unless an explicit API-contract change is approved.

Never return SQL text, database/provider errors, stack traces, credentials, JWTs or secret configuration. Logs must exclude raw request bodies and query strings where they may contain credentials or personal data; retain safe route template, method, status, internal exception category and correlation ID.

## 4. Test requirements

For each target rule, test both invalid requests and concurrency/replay paths where applicable: hierarchy/cycle races, duplicate active phone, same-Attribute option ownership, Product SKU conflicts, Cart ownership, last-stock race, receipt double-confirm, source-key duplication, voucher final-use race, order idempotency replay/conflict, full transaction rollback, state authorization and retained snapshot stability. Report real test results; a documentation change does not establish runtime acceptance.
