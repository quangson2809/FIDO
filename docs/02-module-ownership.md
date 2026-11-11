# 02 — Module Ownership & Dependencies

## 1. Ownership map

Package ownership remains Modular Monolith + Package by Feature + layered architecture. Persistence ownership follows the revised 30-table option-only target ERD.

| Module | Business responsibility | Target tables owned |
|---|---|---|
| `account` | Authentication, account lifecycle/profile/address book, staff/customer queries and RBAC | `ACCOUNTS`, `ADDRESSES`, `ROLES`, `PERMISSIONS`, `ACCOUNT_ROLES`, `ROLE_PERMISSIONS` |
| `product` | Public/admin catalog, category/brand, Product parent-child hierarchy, Product images and option-backed descriptive attributes | `CATEGORIES`, `BRANDS`, `PRODUCTS`, `PRODUCT_IMAGES`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS`, `PRODUCT_ATTRIBUTE_VALUES` |
| `cart` | Authenticated Cart and Cart lines | `CARTS`, `CART_ITEMS` |
| `promotion` | Voucher definition, eligibility and global usage count | `VOUCHERS` |
| `order` | Stateless checkout quote orchestration, order placement/state transitions, COD Payment, manual shipping and in-scope after-sales commands | `ORDERS`, `ORDER_ITEMS`, `ORDER_ADDRESSES`, `ORDER_VOUCHER_SNAPSHOTS`, `PAYMENTS`, `SHIPPING_INFOS` |
| `inventory` | Supplier/procurement, GoodsReceipt, warehouse-scoped Product stock and append-only ledger | `SUPPLIERS`, `GOODS_RECEIPTS`, `GOODS_RECEIPT_ITEMS`, `WAREHOUSES`, `INVENTORIES`, `INVENTORY_TRANSACTIONS` |
| `audit` | Append-only records of important administrative and business operations | `AUDIT_LOGS` |
| `report` | Sales and Order-state reporting; query-only aggregation | No dedicated target table |
| `content` | Public content and admin content lifecycle | `CONTENT_PAGES` |

The table sets above cover all 30 approved target tables. A target schema addition needs explicit owner approval and an ERD/dictionary/API amendment.

## 2. API responsibility by domain

- `account`: registration/login, `/me` profile/address/order reads, staff accounts, roles, permissions and customer administration.
- `product`: public/admin Product catalog, categories, brands and catalog metadata read routes.
- `cart`: authenticated Cart read/mutation routes; each line is identified by `product_id`.
- `promotion`: voucher management and voucher eligibility/usage behavior invoked by quote/order flows. It does not own Order transactions.
- `order`: quote, order placement, Order reads/commands, COD Payment and manual ShippingInfo.
- `inventory`: Supplier, GoodsReceipt, stock/ledger reads and adjustments.
- `audit`: audit query API and audit records called by the owning transaction.
- `report`: report query API over target Order/Payment data.
- `content`: public page reads and admin content lifecycle.

The target has no separate Variant, SizeSystem or Color-master API. Child Products use Product resources with a Product ID; option-backed attributes remain descriptive. Do not turn old route numbers into target API obligations.

## 3. Dependency direction

Normal request flow:

```text
Controller -> owning Service -> owning Repository
                       |
                       +-> another module's public service/query contract
```

Approved domain dependencies:

```text
cart ------> product (Product eligibility, display/price reads)
cart ------> inventory (availability query; no stock reservation)
order -----> cart (authenticated checkout input and Cart mutation)
order -----> product (current values and order-time Product snapshots)
order -----> promotion (validate/consume approved voucher quota)
order -----> inventory (stock, ledger and reversal commands)
order -----> audit (required mutation audit)
product ---> inventory (only through an explicit inventory-owned stock-provisioning command, if required by the target creation flow)
inventory -> audit (stock/receipt/adjustment audit)
account ---> audit (privileged account/RBAC changes)
content ---> audit (privileged content changes)
report ----> order/payment query contract (read-only)
```

These arrows express permitted service/query dependencies, not direct imports of another module's Repository. One transaction must include the source aggregate, related stock/payment/voucher effects and required audit for each approved atomic command.

## 4. Module boundaries to preserve

Do not split these concerns into new top-level modules without an architecture decision:

- Checkout quote and Order placement -> `order` orchestration.
- COD Payment and manual shipping -> `order`.
- Supplier and goods receipt -> `inventory`.
- RBAC and staff authorization -> `account`.
- Customer back-office reads -> `account` query/service contract.
- Product stock/ledger mutation -> `inventory` service; catalog/order modules must not bypass it through direct Repository writes.

Guest sessions, ProductVariant persistence, persisted quotes/reservations and event/history tables absent from the approved ERD are not target module responsibilities.
