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


## Phase 0 repository discovery baseline

Verified against `main` at `416e6f64e3b1ddf71a82fd34cb43f962bd03a130` on 2026-09-26:

| Concern | Repository choice/status |
| --- | --- |
| Build | Gradle Kotlin DSL with the checked-in Gradle wrapper |
| Java | 17 toolchain |
| Framework | Spring Boot 4.0.3; Spring Data JPA |
| Database | MySQL Connector/J and a MySQL development datasource are configured |
| Schema migration | No migration tool dependency or migration scripts are present |
| Security | Spring Security is configured; the current `permitAll` rule is temporary bootstrap configuration |
| JWT | No JWT library or token configuration is present |
| Mapping | No mapper library is configured; add none unless an implementation need is approved |
| Tests | JUnit 5, Spring Boot Test, Spring Security Test and H2; the only current test loads the application context |

The agreed nine business modules and global technical packages are already present under `com.fido`. They contain package markers rather than business implementations, so Phase 0 requires no package moves or additional placeholder classes.

### Decisions to resolve before dependent phases

- **Phase 1 schema work:** choose and record a migration tool before adding schema migrations. The current repository has not selected one; no migration files were introduced in Phase 0.
- **Authentication phase:** select/confirm a JWT implementation and configuration before implementing token behavior. The current project has Spring Security only; login identity remains subject to the documented TBD.
- **Canonical implementation docs:** the Codex engineering kit was supplied as a task attachment and is not tracked in this repository. The primary Analyst documents referenced by its source-of-truth file are also absent from the repository tree. Establish a canonical tracked documentation location before later phases depend on those files being available from a checkout.

These are discovery findings only. They do not authorize speculative dependencies, migrations, authentication behavior, or business/API implementation.
