# 02 — Module Ownership & Dependencies

## 1. Ownership map

| Module | Business responsibility | Baseline tables |
|---|---|---|
| `account` | Auth/profile/address, internal staff account, role/permission/RBAC, customer back-office views | `accounts`, `addresses`, `roles`, `permissions`, `account_roles`, `role_permissions` |
| `product` | Public catalog, admin catalog, Category/Brand/Size/Color/Product/Image/Variant | `categories`, `brands`, `size_systems`, `size_values`, `colors`, `products`, `product_images`, `product_variants` |
| `cart` | Guest/account cart and cart items; no stock reservation | `carts`, `cart_items` |
| `promotion` | Voucher identifier/code only in current logical baseline | `vouchers` |
| `order` | Checkout quote orchestration, create Order, state machine, Payment/COD, shipping, after-sales commands | `orders`, `order_items`, `payments`, `shipping_infos` |
| `inventory` | Supplier, GoodsReceipt, current sellable inventory, immutable stock ledger | `suppliers`, `goods_receipts`, `goods_receipt_items`, `inventories`, `inventory_transactions` |
| `audit` | Immutable/auditable important operation records | `audit_logs` |
| `report` | Sales/order-status report queries; no baseline report table | none |
| `content` | Public/admin approved information and policy pages | `content_pages` |

Total: **28 tables**.

## 2. API ownership

- `account`: API #1–10, #58–69, #76–77.
- `product`: API #11–13, #27–45.
- `cart`: API #14–18.
- `order`: API #19–26.
- `inventory`: API #46–57.
- `audit`: API #70.
- `report`: API #71.
- `content`: API #72–75.
- `promotion`: participates in quote/order only where voucher rules are actually locked; full behavior remains yellow/TBD.

## 3. Key dependency direction

```text
controller -> service -> repository
                 |
                 +--> another module's public service/query contract
```

Typical runtime dependencies:

```text
cart ------> product (variant/effective-price read)
order -----> cart (checkout input)
order -----> product (snapshot/product/variant read)
order -----> promotion (only locked voucher behavior)
order -----> inventory (confirm/cancel/return stock commands)
order -----> audit
inventory -> product (variant existence/identity read)
inventory -> audit
account ---> audit (important RBAC changes)
content ---> audit (important admin changes where required)
report ----> order/payment read model
```

These arrows express service/query use, not repository imports.

## 4. Avoid false modules

Do not split the following into new top-level modules in this baseline:

- checkout -> belongs to `order`;
- payment/COD -> `order`;
- shipping -> `order`;
- after-sales -> `order` command behavior;
- supplier/goods receipt -> `inventory`;
- permissions/RBAC -> `account`;
- customer back-office -> `account` read/service concern.

This keeps the already agreed 9-module shape stable.
