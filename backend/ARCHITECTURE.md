# Backend architecture

FIDO uses a modular monolith with package-by-feature organization. All business
code belongs under `com.fido.modules.<capability>`. Technical configuration
belongs under `com.fido.config`; cross-cutting types belong under
`com.fido.common`. Keep `FidoApplication` at `com.fido`.

## Module ownership

| Module | Responsibility |
| --- | --- |
| `account` | Authentication and account, customer profile, address, staff, role, and permission capabilities |
| `product` | Catalog, categories, brands, size systems and values, colors, variants, and images |
| `cart` | Cart, cart items, guest cart, and basic cart calculations |
| `promotion` | Vouchers; detailed voucher rules remain deferred |
| `order` | Checkout, order lifecycle, COD payment, shipping, returns, exchanges, and customer service notes |
| `inventory` | Suppliers, goods receipts, stock, and inventory transactions |
| `audit` | Audit trail |
| `report` | Read-oriented aggregate reports |
| `content` | Website policy and informational pages |

Do not split product catalog subtypes into separate modules. Payment, shipping,
checkout, and after-sales remain within `order`; supplier and goods receipt
remain within `inventory`.

## Package and layer rules

Each module uses only the layers it needs: `controller`, `service`,
`repository`, `entity`, `dto`, and `mapper`. Do not create root-level
business packages such as `com.fido.controller`, `com.fido.service`,
`com.fido.repository`, or `com.fido.entity`.

- Controllers handle HTTP, validation, status codes, and delegate to services.
- Services own business orchestration and transaction boundaries.
- Repositories handle persistence and do not own business rules.
- Entities represent persistence data and are not returned directly by controllers.
- DTOs define API contracts; mappers translate between entities and DTOs.
- Use constructor injection. Do not use field injection.
- A module must not access another module's repository directly. Use an
  appropriate service contract and avoid circular dependencies.
- Add service interfaces only for multiple implementations, module contracts,
  replaceable implementations, or external integrations.
- Do not add generic base layers, helpers, or utilities without a real use.

## Bootstrap boundaries

This branch establishes package locations and Spring configuration only. It
does not implement entities, repositories, CRUD, JWT, RBAC, checkout, order
workflows, inventory locking, voucher rules, audit interception, or migrations.

Security currently permits requests temporarily for bootstrap and is not a
production security configuration. Replace that rule in the authentication
phase.

Future order and inventory work must preserve atomic stock checks and updates,
restore stock on eligible cancellations, keep COD payment status independent
from order status, preserve order-item snapshots, and make important actions
auditable.
