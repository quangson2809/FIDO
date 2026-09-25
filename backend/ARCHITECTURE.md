# Backend architecture
FIDO backend uses a modular monolith with package-by-feature organization. Business capabilities live under `com.fido.modules.<capability>`; technical configuration stays under `com.fido.config`, and cross-cutting types belong under `com.fido.common`.

## Module ownership
| Module | Responsibility |
| --- | --- |
| `account` | Authentication and account, customer profile, address, staff, role, and permission capabilities |
| `product` | Product catalog, categories, brands, size systems and values, colors, variants, and images |
| `cart` | Cart, cart items, guest cart, and basic cart calculations |
| `promotion` | Vouchers; detailed voucher rules remain deferred |
| `order` | Checkout, order lifecycle, COD payment, shipping, returns, exchanges, and customer service notes |
| `inventory` | Suppliers, goods receipts, stock, and inventory transactions |
| `audit` | Audit trail |
| `report` | Read-oriented aggregate reports |
| `content` | Website policy and informational pages |

Within a module, use only the layers it needs: `controller`, `service`, `repository`, `entity`, `dto`, and `mapper`. Package skeletons do not mean those layers contain implementations.

## Dependency direction
Controllers handle HTTP and delegate to services. Services own business orchestration and transaction boundaries. Repositories handle persistence. A module must not call another module's repository directly; future cross-module work should use a service-level contract and avoid circular dependencies.

## Bootstrap boundaries
This branch sets up package locations and shared Spring configuration only. It does not implement entities, CRUD, JWT, RBAC, checkout, order workflows, inventory locking, voucher rules, audit interception, or migrations.

Future order and inventory work must preserve atomic stock checks and updates, restore stock on eligible cancellations, keep COD payment status independent from order status, preserve order-item snapshots, and make important actions auditable.
