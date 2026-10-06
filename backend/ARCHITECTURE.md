# Backend architecture

FIDO uses a modular monolith organized by feature. Business code lives under `com.fido.modules.<module>`; `com.fido.config` and `com.fido.common` contain technical concerns. `com.fido.FidoApplication` is the entry point. See `docs/01-architecture-package-structure.md` for the normative layer/dependency rules and `backend/AGENTS.md` for working and review guidance.

| Module | Ownership |
| --- | --- |
| `account` | Authentication, profile/address, staff, roles, permissions and customer back-office |
| `product` | Catalog, category/brand/size/color, products, images and variants |
| `cart` | Authenticated cart operations; guest session behavior remains deferred |
| `promotion` | Voucher identifier/integration; discount rules remain deferred |
| `order` | Checkout, order lifecycle, COD/payment, shipping and after-sales commands |
| `inventory` | Supplier, goods receipt, sellable inventory and immutable movement ledger |
| `audit` | Important action history |
| `report` | Read-only sales/status aggregates |
| `content` | Public and admin information pages |

Each module uses only the packages and classes it needs. Controllers handle HTTP; services own domain orchestration and transaction boundaries; repositories perform persistence and queries. Controllers do not return JPA entities. Cross-module writes use the owning module's service contract, and cross-module reads use explicit contracts or read models; modules do not inject each other's repositories. Report's aggregate-only JDBC queries are an explicit documented exception to ordinary module reads and do not change Order/Payment ownership.

## Current implementation status

The old Phase 0 discovery snapshot was taken from `main` at `416e6f64e3b1ddf71a82fd34cb43f962bd03a130` on 2026-09-26. Its claims that migrations, JWT and business implementations were absent described that historic checkout. They are **not current branch status**.

This branch now includes Flyway migrations for the approved relational baseline, Spring Security JWT/RBAC, services/controllers/repositories for the implemented backend phases, and H2/MySQL CI verification. The Phase 7 gate is recorded in `docs/16-phase-7-gate.md`; Phase 8 hardening and unresolved/deferred slices are in `docs/11-implementation-phases.md` and `docs/12-tbd-out-of-scope.md`. Technical decisions belong in `docs/15-technical-decisions.md`.

Some services have distinct query and command entry points to isolate real responsibilities. This is an in-process service organization, not a requirement to split every service or adopt separate read/write data stores. Commands may read for validation; queries have no persistence side effects. Use KISS/YAGNI and evidence about cohesion, coupling, transaction boundaries and change cost before adding abstractions.

## Verification boundary

`.github/workflows/backend-verification.yml` runs H2 build and MySQL migration/mapping/tests. `ArchitectureBoundaryTests` also enforces a small set of non-negotiable structural rules against production classes: no field injection, no controller-to-persistence dependency, no cross-module repository dependency, and no entity dependency on API/service/repository/DTO layers.

This executable guard protects clear dependency boundaries; it does **not** score design quality or replace contextual review of cohesion, responsibilities, transaction ownership, security, business behavior or appropriate abstractions. CI remains technical evidence only, and a green build by itself is not sufficient evidence that the whole backend has been audited.
