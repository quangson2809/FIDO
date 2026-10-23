# P1 — Domain Invariants

**Status: PARTIAL.** Source-confirmed rules are separated from target behavior that still requires DB-01/02/03/05/06/07/08/09 approval.

## Account and RBAC
- INV-ACC-01: Phone is the login identity and is unique among active accounts; reuse is allowed after soft deletion (owner decision DB-09, 2026-10-23). Never expose password hashes; retain generic credential-failure behavior. The physical enforcement strategy must match this rule and be verified on MySQL.
- INV-ACC-02: /me resources, saved addresses and customer orders are scoped to authenticated principal. Client account IDs never authorize access.
- INV-RBAC-01: Resolve effective grants from the database; never trust role claims from the client. Role/permission replacement and audit are atomic; preserve last-SUPERADMIN protection.
- INV-ACC-03: Target Account status literals and their login/session effects are not approved; do not invent a new lifecycle.
- INV-SEED-01: Required system roles/permissions and the initial SUPERADMIN bootstrap path must be deterministic and separate from demo fixtures; credentials remain external and are never committed. DB-11 must approve the seed inventory and bootstrap boundary.

## Product, Attribute and Image
- INV-PROD-01: Parent references must exist and graph must be acyclic; permitted hierarchy depth remains DB-01.
- INV-PROD-02: Both parent and child Products are sellable and each has its own SKU, price and inventory (owner decision DB-01, 2026-10-23). Cart/Order/receipt/Inventory target Product IDs replace legacy Variant IDs; public API compatibility mapping still requires documentation and tests.
- INV-PROD-03: Dynamic attributes are descriptive only and do not generate variants; child Products are created explicitly (owner decision DB-02, 2026-10-23). Do not derive SKU/Product rows from attribute combinations. Existing ERD inheritance annotations remain the only inheritance authority; do not implicitly inherit category, brand, status, SKU or images.
- INV-PROD-04: Preserve leaf Category assignment unless explicitly amended; protect in-use categories.
- INV-ATTR-01: OPTION/TEXT/NUMBER/BOOLEAN are candidate data types. Each row needs one compatible typed value; an option must belong to the same Attribute.
- INV-ATTR-02: Unique SKU does not guarantee a unique variant-defining option combination. Approve a signature/unique guard or explicitly accept the weaker behavior.
- INV-IMG-01: Never reconstruct historical Order images from the current gallery; approve image snapshot or no-history guarantee.

## Cart, Price, Checkout and Order
- INV-CART-01: A-03 approves JWT-required Cart, quote and Create Order. No guest session/cart merge.
- INV-CART-02: Quantity must be positive; add and replace semantics differ; Cart never deducts stock.
- INV-CART-03: One active Cart/account is not implied by status; approve if required and enforce concurrent creation safely.
- INV-PRICE-01: The server controls effective price, discount, shipping fee, subtotal and total.
- INV-QUOTE-01: CHECKOUT_QUOTES is absent. Approve nonpersistent preview with order-time recalculation or amend ERD formally.
- INV-ORDER-01: Same key + same normalized payload replays one committed Order; changed payload conflicts; cross-account reuse never leaks another Order. DB-05 must define exact scope/retention.
- INV-ORDER-02: Draft total = subtotal - discount + shipping and line_total = unit_price * quantity - line discount are proposals until DB-10 approves currency, decimal precision/scale, rounding point and allocation/reconciliation.
- INV-ORDER-03: Capture SKU/name/attributes/quantity/unit price/discount/line total at placement; never query live catalog to recreate historical facts.
- INV-ORDER-04: Only approved state transitions are allowed. Order and Payment status remain separate.
- INV-ADDR-01: Saved Address differs from OrderAddress. Recipient PATCH through PREPARING and duplicated ShippingInfo receiver fields need DB-07/08 resolution.

## Voucher, Payment and Shipping
- INV-VOUCHER-01: Discount type/formula/date/min/max/scope/stacking/limits and cancellation restoration need DB-06 approval; currency/scale/rounding interaction needs DB-10. Target lacks scope joins and usage ledger.
- INV-VOUCHER-02: Snapshot voucher code/type/value/discount so future edits do not rewrite old Orders.
- INV-VOUCHER-03: Any usage limit needs serialized consumption/restoration; unique voucher code is insufficient.
- INV-PAY-01: COD only is the source baseline; collector identity/time are server-derived by authorized command.
- INV-PAY-02: Target lacks refund amount/actor/time. Do not claim auditable partial refunds before DB-08 approval.
- INV-SHIP-01: Carrier/tracking fields are not an integration contract; approve status transitions/timestamps and recipient source.

## Inventory, Supplier and Goods Receipt
- INV-STOCK-01: Target quantity_on_hand is not automatically legacy available_quantity; quantity meaning and deduction timing are DB-03.
- INV-STOCK-02: Balance, immutable ledger and relevant Order/Receipt state/audit commit or roll back together.
- INV-STOCK-03: Use row lock or guarded version update and check affected row count; @Transactional alone does not prevent lost updates.
- INV-STOCK-04: Receipt movement must match Product/warehouse and positive inbound delta; Order movement matches OrderItem/Product and outbound delta.
- INV-STOCK-05: Retry cannot duplicate stock. Unique idempotency key alone cannot stop the same source movement under another key.
- INV-RECEIPT-01: Confirm GoodsReceipt once; target does not persist the destination warehouse.
- INV-STOCK-06: Current adjustment API requires a reason but target ledger omits it; persist it or approve another contract.

## Audit, Content, Soft Delete and Reports
- INV-AUDIT-01: Before/after JSON allowlist excludes password/hash, tokens, OTP, cookies/session IDs, secrets, raw authorization headers and unnecessary PII.
- INV-AUDIT-02: Nullable actor requires system-event policy; correlation IDs do not establish identity.
- INV-CONTENT-01: Slug unique in ERD; public endpoint serves only approved published content; pageCode-to-slug compatibility is open.
- INV-SOFTDELETE-01: Product status and deleted_at are separate. Define visibility/parent history; never cascade-delete Order, ledger or audit.
- INV-REPORT-01: Follow docs/15 approved formulas: include shipping in received sales, subtract returns in original completion period, group current states by Order creation date and use Asia/Ho_Chi_Minh boundaries.
